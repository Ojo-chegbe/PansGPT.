import React from 'react';
import { NextPage } from 'next';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import DocumentUploadForm from '../../../components/DocumentUploadForm';
import Head from 'next/head';

const UploadDocumentPage: NextPage = () => {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status;
  const router = useRouter();

  // Redirect if not authenticated
  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <>
      <Head>
        <title>Upload Document - Admin Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h1 className="text-2xl font-semibold text-gray-900 mb-6">
                  Upload New Document
                </h1>
                
                <div className="prose prose-sm text-gray-500 mb-6">
                  <p>
                    Upload a PDF document with its metadata. The document will be stored and can be processed for AI training.
                    All fields marked with * are required.
                  </p>
                </div>

                <DocumentUploadForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UploadDocumentPage; 