import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowRight, 
  ChefHat, 
  TrendingUp, 
  Box, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Users
} from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 font-sans selection:bg-amber-200 selection:text-amber-900 overflow-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 text-amber-600">
            <ChefHat size={32} strokeWidth={2.5} />
            <span className="font-serif text-2xl font-bold tracking-tight text-stone-900">Bakery Manager</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
            <a href="#features" className="hover:text-amber-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-amber-600 transition-colors">Pricing</a>
            <button className="bg-stone-900 text-white px-6 py-2.5 rounded-full hover:bg-stone-800 transition-all active:scale-95 font-semibold shadow-lg shadow-stone-900/20">
              Join Waitlist
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 px-6 relative">
        {/* Background Decorative Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-gradient-to-b from-amber-100/50 to-transparent rounded-full blur-3xl -z-10" />
        
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-bold tracking-wide uppercase mb-8 border border-amber-200 shadow-sm"
          >
            <Sparkles size={16} />
            <span>The Future of Bakery Management</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold text-stone-900 tracking-tight leading-[1.1] mb-8"
          >
            Run your bakery like a <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">well-oiled machine.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-stone-600 max-w-3xl mx-auto leading-relaxed mb-12"
          >
            Track inventory down to the gram, manage daily production runs, and see your exact margins in real-time. Built specifically for modern bakeries.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white text-lg font-semibold px-8 py-4 rounded-full shadow-xl shadow-amber-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
              Request Early Access
              <ArrowRight size={20} />
            </button>
            <button className="w-full sm:w-auto bg-white hover:bg-stone-50 text-stone-800 text-lg font-semibold px-8 py-4 rounded-full border border-stone-200 shadow-sm transition-all active:scale-95">
              View Demo Video
            </button>
          </motion.div>

          {/* Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-20 relative mx-auto max-w-5xl"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-transparent to-transparent z-10 rounded-[2rem]" />
            <img 
              src="/dashboard_mockup.png" 
              alt="Bakery Manager Dashboard" 
              className="w-full h-auto rounded-[2rem] shadow-2xl shadow-stone-900/20 border border-stone-200 object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-stone-900 mb-6">Everything you need to scale</h2>
            <p className="text-xl text-stone-500 max-w-2xl mx-auto">Stop guessing your margins and losing track of ingredients. We handle the math so you can focus on baking.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Box size={32} />,
                title: "Precision Inventory",
                desc: "Track raw materials and finished goods in real-time. Automated deductions when you log production runs."
              },
              {
                icon: <TrendingUp size={32} />,
                title: "Live Cost Margins",
                desc: "Instantly see the true cost and profit margin of every croissant, cake, and loaf of bread you sell."
              },
              {
                icon: <Clock size={32} />,
                title: "Production Planning",
                desc: "Schedule and record daily batches. Keep a historical log of everything produced and its yield."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 rounded-[2rem] bg-stone-50 border border-stone-100 hover:shadow-xl hover:shadow-stone-200/50 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-4">{feature.title}</h3>
                <p className="text-stone-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Inventory Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mt-24 max-w-4xl mx-auto rounded-[2rem] p-4 bg-stone-100 border border-stone-200/60 shadow-xl shadow-stone-900/5"
          >
            <img 
              src="/inventory_mockup.png" 
              alt="Bakery Inventory Management" 
              className="w-full h-auto rounded-xl shadow-sm object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-stone-900 text-stone-50 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-full max-w-3xl h-full bg-gradient-to-l from-amber-500/10 to-transparent blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Simple, transparent pricing</h2>
            <p className="text-xl text-stone-400 max-w-2xl mx-auto">Plans designed to grow alongside your bakery, from your first home kitchen to a multi-location empire.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-stone-800 rounded-[2rem] p-8 border border-stone-700 flex flex-col"
            >
              <h3 className="text-2xl font-bold text-white mb-2">Hobbyist</h3>
              <p className="text-stone-400 mb-6 min-h-[48px]">Perfect for home bakers starting out.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-white">$0</span>
                <span className="text-stone-400">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Up to 10 menu items",
                  "Basic inventory tracking",
                  "Manual order entry",
                  "Community support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-stone-300">
                    <CheckCircle2 size={20} className="text-amber-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 rounded-xl font-bold text-stone-900 bg-white hover:bg-stone-200 transition-colors">
                Start for Free
              </button>
            </motion.div>

            {/* Pro Plan */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-b from-amber-500 to-orange-600 rounded-[2rem] p-8 border border-amber-400 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-amber-500/20"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-stone-900 text-amber-400 px-4 py-1 rounded-full text-sm font-bold tracking-widest uppercase border border-amber-500/30">
                Most Popular
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Bakery Pro</h3>
              <p className="text-amber-100 mb-6 min-h-[48px]">Single-user plan for growing independent bakeries.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-white">$49</span>
                <span className="text-amber-200">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Unlimited menu items",
                  "Advanced production planning",
                  "Cost & profit margin analysis",
                  "Shopify / POS integrations",
                  "Priority email support"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white">
                    <CheckCircle2 size={20} className="text-amber-200 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 rounded-xl font-bold text-amber-600 bg-white hover:bg-amber-50 transition-colors shadow-lg">
                Start 14-Day Trial
              </button>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-stone-800 rounded-[2rem] p-8 border border-stone-700 flex flex-col"
            >
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-2xl font-bold text-white">Team</h3>
                <Users size={20} className="text-stone-400" />
              </div>
              <p className="text-stone-400 mb-6 min-h-[48px]">Multi-user access for larger operations.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-white">$149</span>
                <span className="text-stone-400">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {[
                  "Everything in Pro",
                  "Up to 10 staff accounts",
                  "Role-based permissions",
                  "Multiple locations",
                  "1-on-1 onboarding"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-stone-300">
                    <CheckCircle2 size={20} className="text-amber-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="w-full py-4 rounded-xl font-bold text-stone-900 bg-white hover:bg-stone-200 transition-colors">
                Contact Sales
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer / Final CTA */}
      <footer className="py-24 bg-stone-50 border-t border-stone-200 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold text-stone-900 mb-6">Ready to take control of your kitchen?</h2>
          <p className="text-xl text-stone-600 mb-10">Join hundreds of bakeries that are saving hours every week on inventory and planning.</p>
          <button className="bg-stone-900 hover:bg-stone-800 text-white text-xl font-semibold px-10 py-5 rounded-full shadow-2xl shadow-stone-900/20 transition-all active:scale-95 inline-flex items-center gap-3">
            Join the Waitlist Now
            <ArrowRight size={24} />
          </button>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
