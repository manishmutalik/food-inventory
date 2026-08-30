import { AlertCircle } from 'lucide-react';
import { auth } from '../firebase';
import React, { Component, ErrorInfo, ReactNode } from 'react';

// ─── Error Handling ───────────────────────────────────────────────────────────

/**
 * Enumerates the type of Firestore operation being performed.
 * Used by `handleFirestoreError` to enrich error logs.
 */
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

/**
 * Structured error payload captured when a Firestore operation fails.
 * Includes the raw error message, operation type, collection path,
 * and a snapshot of the currently authenticated user's state.
 */
interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

/**
 * Centralised Firestore error handler.
 *
 * Serialises the error together with current auth context into a
 * `FirestoreErrorInfo` JSON blob, logs it to the console, then
 * re-throws so that the `ErrorBoundary` can surface it to the user.
 *
 * @param error        - The raw caught error value.
 * @param operationType - The CRUD operation that failed (see `OperationType`).
 * @param path         - The Firestore document/collection path being accessed, or null.
 */
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


// ─── Error Boundary ───────────────────────────────────────────────────────────

/**
 * Top-level React error boundary that wraps `BakeryApp`.
 *
 * Catches any uncaught render-time errors (including re-thrown errors from
 * `handleFirestoreError`) and renders a friendly error card with a
 * "Reload Application" button instead of a blank screen.
 *
 * Error messages are expected to be JSON-serialised `FirestoreErrorInfo`
 * strings; if parsing fails, the raw message is displayed.
 */
class ErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorInfo: '' };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo);
        if (parsed.error) displayMessage = `Database Error: ${parsed.error}`;
      } catch (e) {
        displayMessage = this.state.errorInfo;
      }

      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[10px] sm:rounded-[15px] shadow-xl border border-stone-200 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">Application Error</h2>
            <p className="text-stone-600 mb-6">{displayMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

