import express from "express";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());
  app.use(cookieParser(process.env.COOKIE_SECRET || "bakery-secret"));

  // --- Shopify OAuth Routes ---

  app.get("/api/shopify/config-status", (req, res) => {
    res.json({
      hasEnvCredentials: !!(process.env.SHOPIFY_CLIENT_ID && process.env.SHOPIFY_CLIENT_SECRET)
    });
  });

  app.get("/api/auth/shopify", (req, res) => {
    const shop = req.query.shop as string;
    const queryClientId = req.query.clientId as string;
    const queryClientSecret = req.query.clientSecret as string;

    if (!shop) {
      return res.status(400).send("Missing shop parameter");
    }

    const clientId = process.env.SHOPIFY_CLIENT_ID || queryClientId;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || queryClientSecret;

    if (!clientId || !clientSecret) {
      console.error("Shopify credentials missing");
      return res.status(400).send("Shopify API credentials (CLIENT_ID/SECRET) are missing. Please provide them in the settings or environment variables.");
    }

    // If credentials were provided in query, store them in cookies for the callback
    if (queryClientId && queryClientSecret) {
      res.cookie("temp_shopify_client_id", queryClientId, { httpOnly: true, secure: true, sameSite: "none" });
      res.cookie("temp_shopify_client_secret", queryClientSecret, { httpOnly: true, secure: true, sameSite: "none" });
    }

    // Ensure shop has .myshopify.com
    const fullShop = shop.includes('.') ? shop : `${shop}.myshopify.com`;

    const scopes = "read_orders,read_products";
    // Ensure APP_URL doesn't have a trailing slash for consistent redirect URI
    const baseUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    if (!baseUrl) {
      console.error("APP_URL environment variable is missing");
      return res.status(500).send("APP_URL environment variable is not configured.");
    }
    const redirectUri = `${baseUrl}/api/auth/shopify/callback`;
    
    const shopifyUrl = `https://${fullShop}/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
    
    res.json({ url: shopifyUrl });
  });

  app.get("/api/auth/shopify/callback", async (req, res) => {
    const { shop, code } = req.query;

    if (!shop || !code) {
      return res.status(400).send("Missing shop or code");
    }

    // Ensure shop has .myshopify.com for the token exchange
    const fullShop = (shop as string).includes('.') ? (shop as string) : `${shop}.myshopify.com`;

    try {
      console.log(`Exchanging code for token for shop: ${fullShop}`);
      
      const clientId = process.env.SHOPIFY_CLIENT_ID || req.cookies.temp_shopify_client_id;
      const clientSecret = process.env.SHOPIFY_CLIENT_SECRET || req.cookies.temp_shopify_client_secret;

      if (!clientId || !clientSecret) {
        throw new Error("Missing Shopify credentials for token exchange");
      }

      const response = await axios.post(`https://${fullShop}/admin/oauth/access_token`, {
        client_id: clientId,
        client_secret: clientSecret,
        code,
      });

      const { access_token } = response.data;

      // Clear temp cookies
      res.clearCookie("temp_shopify_client_id");
      res.clearCookie("temp_shopify_client_secret");

      // Store in a secure, same-site cookie for the iframe context
      res.cookie("shopify_token", access_token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.cookie("shopify_shop", shop as string, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'SHOPIFY_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Shopify connected successfully! You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Shopify OAuth Error:", error.response?.data || error.message);
      res.status(500).send("Failed to exchange Shopify code for token");
    }
  });

  app.get("/api/shopify/status", (req, res) => {
    const token = req.cookies.shopify_token;
    const shop = req.cookies.shopify_shop;
    res.json({ connected: !!token, shop: shop || null });
  });

  app.get("/api/shopify/orders", async (req, res) => {
    const token = req.cookies.shopify_token;
    const shop = req.cookies.shopify_shop;
    const date = req.query.date as string; // YYYY-MM-DD

    if (!token || !shop) {
      return res.status(401).json({ error: "Shopify not connected" });
    }

    try {
      // Shopify uses ISO8601. We want orders created on this specific day.
      const startTime = `${date}T00:00:00Z`;
      const endTime = `${date}T23:59:59Z`;

      const response = await axios.get(
        `https://${shop}/admin/api/2024-01/orders.json?created_at_min=${startTime}&created_at_max=${endTime}&status=any`,
        {
          headers: {
            "X-Shopify-Access-Token": token,
          },
        }
      );

      res.json(response.data.orders);
    } catch (error: any) {
      console.error("Shopify API Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch orders from Shopify" });
    }
  });

  app.post("/api/shopify/disconnect", (req, res) => {
    res.clearCookie("shopify_token");
    res.clearCookie("shopify_shop");
    res.json({ success: true });
  });

  // --- Odoo Integration Routes ---

  app.get("/api/odoo/status", (req, res) => {
    const url = req.cookies.odoo_url;
    const db = req.cookies.odoo_db;
    const username = req.cookies.odoo_username;
    const password = req.cookies.odoo_password;
    res.json({ connected: !!(url && db && username && password), url: url || null });
  });

  app.post("/api/odoo/connect", async (req, res) => {
    const { url, db, username, password } = req.body;

    if (!url || !db || !username || !password) {
      return res.status(400).json({ error: "Missing Odoo credentials" });
    }

    try {
      // Clean URL: remove trailing slash
      const cleanUrl = url.replace(/\/$/, "");
      
      // Verify credentials by attempting to authenticate
      const authResponse = await axios.post(`${cleanUrl}/jsonrpc`, {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "common",
          method: "authenticate",
          args: [db, username, password, {}]
        }
      });

      const uid = authResponse.data.result;
      if (!uid) {
        return res.status(401).json({ error: "Invalid Odoo credentials" });
      }

      // Store in secure cookies
      const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" as const };
      res.cookie("odoo_url", cleanUrl, cookieOptions);
      res.cookie("odoo_db", db, cookieOptions);
      res.cookie("odoo_username", username, cookieOptions);
      res.cookie("odoo_password", password, cookieOptions);

      res.json({ success: true, uid });
    } catch (error: any) {
      console.error("Odoo connection error:", error.message);
      res.status(500).json({ error: "Failed to connect to Odoo" });
    }
  });

  app.get("/api/odoo/orders", async (req, res) => {
    const url = req.cookies.odoo_url;
    const db = req.cookies.odoo_db;
    const username = req.cookies.odoo_username;
    const password = req.cookies.odoo_password;
    const date = req.query.date as string; // YYYY-MM-DD

    if (!url || !db || !username || !password) {
      return res.status(401).json({ error: "Odoo not connected" });
    }

    try {
      // 1. Authenticate
      const authResponse = await axios.post(`${url}/jsonrpc`, {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "common",
          method: "authenticate",
          args: [db, username, password, {}]
        }
      });

      const uid = authResponse.data.result;
      if (!uid) throw new Error("Authentication failed");

      // 2. Search for orders on the specific date
      // Odoo's sale.order date is usually 'date_order'
      const startTime = `${date} 00:00:00`;
      const endTime = `${date} 23:59:59`;

      const searchResponse = await axios.post(`${url}/jsonrpc`, {
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "object",
          method: "execute_kw",
          args: [
            db, uid, password,
            "sale.order", "search_read",
            [[
              ["date_order", ">=", startTime],
              ["date_order", "<=", endTime],
              ["state", "in", ["sale", "done"]]
            ]],
            { fields: ["name", "order_line", "amount_total", "partner_id"] }
          ]
        }
      });

      const orders = searchResponse.data.result;

      // 3. For each order, fetch line items if needed
      // Actually search_read with order_line gives us IDs. We need the details.
      const enrichedOrders = await Promise.all(orders.map(async (order: any) => {
        const linesResponse = await axios.post(`${url}/jsonrpc`, {
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              db, uid, password,
              "sale.order.line", "read",
              [order.order_line],
              { fields: ["product_id", "product_uom_qty", "price_unit"] }
            ]
          }
        });
        return { ...order, line_items: linesResponse.data.result };
      }));

      res.json(enrichedOrders);
    } catch (error: any) {
      console.error("Odoo API Error:", error.message);
      res.status(500).json({ error: "Failed to fetch orders from Odoo" });
    }
  });

  app.post("/api/odoo/disconnect", (req, res) => {
    res.clearCookie("odoo_url");
    res.clearCookie("odoo_db");
    res.clearCookie("odoo_username");
    res.clearCookie("odoo_password");
    res.json({ success: true });
  });

  // --- Vite Middleware ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
