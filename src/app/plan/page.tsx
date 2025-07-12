"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import Script from 'next/script';
import { Suspense } from "react";

interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  trialEndDate?: string;
  planType: 'trial' | 'paid' | 'none';
  startDate: string;
}

export default function PlanPageWrapper() {
  return (
    <Suspense>
      <PlanPage />
    </Suspense>
  );
}

function PlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'error' | null>(null);
  const { data: session, status: sessionStatus } = useSession();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success' || status === 'error') {
      setPaymentStatus(status);
      // Remove status from URL
      router.replace('/plan');
    }
    fetchSubscriptionStatus();
  }, [searchParams, router]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackPayment = async () => {
    if (!session?.user?.email) {
      setPaymentStatus('error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Calculate amount with Paystack fees (1.5% + ₦100)
      const baseAmount = 2000; // Base amount in Naira
      const feePercentage = 0.015; // 1.5%
      const fixedFee = 100; // ₦100
      const totalAmount = Math.ceil(baseAmount + (baseAmount * feePercentage) + fixedFee);

      // Initialize payment with backend
      const response = await fetch('/api/subscription/initialize-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: session.user.email,
          amount: totalAmount, // Amount with fees
          callback_url: `${window.location.origin}/plan?status=success`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }

      const data = await response.json();
      
      if (!data.reference) {
        throw new Error('Failed to initialize payment');
      }

      // @ts-ignore - Paystack is loaded via script
      const handler = PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
        email: session.user.email,
        amount: totalAmount * 100, // Convert to kobo
        currency: 'NGN',
        ref: data.reference,
        onSuccess: async (response: any) => {
          try {
            // Verify payment on backend
            const verifyResponse = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include',
              body: JSON.stringify({
                reference: response.reference,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            const verifyData = await verifyResponse.json();
            
            if (verifyData.success) {
              setPaymentStatus('success');
              fetchSubscriptionStatus(); // Refresh subscription status
            } else {
              setPaymentStatus('error');
            }
          } catch (error) {
            console.error('Error verifying payment:', error);
            setPaymentStatus('error');
          } finally {
            setIsProcessingPayment(false);
          }
        },
        onCancel: () => {
          setIsProcessingPayment(false);
        },
      });

      handler.openIframe();
    } catch (error) {
      console.error('Error processing payment:', error);
      setPaymentStatus('error');
      setIsProcessingPayment(false);
    }
  };

  const handleStartTrial = async () => {
    try {
      const response = await fetch('/api/subscription/status', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.isActive || data.isTrial) {
        // If already has trial or subscription, go to main page
        window.location.href = '/main';
      } else {
        // Create new trial
        const trialResponse = await fetch('/api/subscription/create-trial', {
          method: 'POST',
          credentials: 'include'
        });
        const trialData = await trialResponse.json();
        
        if (trialData.success) {
          window.location.href = '/main';
        }
      }
    } catch (error) {
      console.error('Error starting trial:', error);
      setPaymentStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="afterInteractive" />
      <div className="min-h-screen bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          {/* Payment Status Messages */}
          {paymentStatus === 'success' && (
            <div className="mb-8 p-4 bg-green-900/30 border border-green-500 rounded-lg">
              <p className="text-center text-green-300">
                Payment successful! Your subscription is now active.
              </p>
            </div>
          )}
          {paymentStatus === 'error' && (
            <div className="mb-8 p-4 bg-red-900/30 border border-red-500 rounded-lg">
              <p className="text-center text-red-300">
                Payment failed. Please try again or contact support.
              </p>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4">Your Plan</h1>
            <p className="text-gray-400 text-lg">
              Manage your subscription and access premium features
            </p>
            {sessionStatus === "authenticated" && (
              <button
                onClick={() => router.push('/main')}
                className="mt-8 px-6 py-3 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-colors text-white"
              >
                Back to AI Chat Page
              </button>
            )}
          </div>

          {/* Current Plan Status */}
          <div className="bg-[#232625] rounded-lg p-8 mb-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">
                {subscription?.isTrial ? `You're currently on a Free Trial` : 'Premium Plan'}
              </h2>
              <div className="flex items-center justify-center space-x-2">
                {subscription?.isTrial ? (
                  <>
                    <span className="text-4xl font-bold">₦2,130</span>
                    <span className="text-gray-400">/month (Premium Plan)</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-bold">₦2,130</span>
                    <span className="text-gray-400">/month</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-2">Includes Paystack processing fees</p>
            </div>

            {subscription?.isTrial && subscription?.trialEndDate && new Date(subscription.trialEndDate) < new Date() ? (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 mb-6">
                <p className="text-center text-red-300">
                  Your free trial is over, but PANSGPT is just getting started. Subscribe to continue.
                </p>
              </div>
            ) : subscription?.isTrial && (
              <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mb-6">
                <p className="text-center text-green-300">
                  Your free trial ends in {new Date(subscription.trialEndDate!).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Plan Features:</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-2 flex-shrink-0" />
                  <span>Access to all study materials</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-2 flex-shrink-0" />
                  <span>Faster AI replies</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-2 flex-shrink-0" />
                  <span>Access to exclusive explanations</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-2 flex-shrink-0" />
                  <span>Unlimited conversations</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-2 flex-shrink-0" />
                  <span>Early access to new features</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-2 flex-shrink-0" />
                  <span>Detailed explanations</span>
                </li>
                <li className="flex items-start">
                  <CheckIcon className="h-6 w-6 text-green-400 mr-2 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              {subscription?.isTrial && (
                <p className="text-center text-gray-400 mb-4 text-sm">
                  Don't get left behind, learn like top students.
                </p>
              )}
              {!subscription?.isActive && !subscription?.isTrial && (
                <>
                  <button
                    onClick={handleStartTrial}
                    className="w-full py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 transition-colors"
                    disabled={isProcessingPayment}
                  >
                    Start Free Trial
                  </button>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handlePaystackPayment();
                  }}>
                    <button
                      type="submit"
                      className="w-full py-3 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-colors"
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? 'Processing...' : 'Subscribe Now'}
                    </button>
                  </form>
                </>
              )}
              {subscription?.isTrial && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handlePaystackPayment();
                }}>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 transition-colors"
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? 'Processing...' : 'Upgrade to Premium Now'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className="bg-[#232625] p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">How does the free trial work?</h3>
                <p className="text-gray-400">
                  You get full access to all premium features for 7 days. No credit card required to start the trial.
                </p>
              </div>
              <div className="bg-[#232625] p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">What happens after the trial?</h3>
                <p className="text-gray-400">
                  After your 7-day trial, you'll need to subscribe to continue accessing premium features. You can cancel anytime.
                </p>
              </div>
              <div className="bg-[#232625] p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Can I subscribe before my trial ends?</h3>
                <p className="text-gray-400">
                  Yes! You can upgrade to a premium subscription at any time, even before your trial ends. Your subscription will start immediately.
                </p>
              </div>
              <div className="bg-[#232625] p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">How do I cancel my subscription?</h3>
                <p className="text-gray-400">
                  You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period.
                </p>
              </div>
            </div>
          </div>

          {sessionStatus === "authenticated" && (
            <div className="text-center mt-12">
              <button
                onClick={() => router.push('/main')}
                className="px-6 py-3 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-colors text-white"
              >
                Back to AI Chat Page
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 