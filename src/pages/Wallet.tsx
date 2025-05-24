import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { ChevronLeft } from "lucide-react";

const Wallet = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-brand-light text-foreground font-nunito">
      {/* Header with Back Button */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <Button
          variant="ghost"
          onClick={() => navigate("/profile")}
          className="text-brand hover:text-brand-dark transition-colors duration-300"
        >
          <ChevronLeft className="w-5 h-5 mr-2" /> Back
        </Button>
        <h1 className="text-xl font-bold ml-4">Wallet</h1>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative">
          {/* Wallet Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 opacity-50 pointer-events-none">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Wallet Balance</h2>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">₦0.00</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Available Balance</p>
            <div className="mt-6 flex space-x-4">
              <Button
                className="bg-brand hover:bg-brand-dark text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors duration-300"
                disabled
              >
                Add Funds
              </Button>
              <Button
                variant="outline"
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-4 py-2 text-sm transition-colors duration-300"
                disabled
              >
                Withdraw
              </Button>
            </div>
          </div>
          {/* Coming Soon Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-400">Coming Soon</h2>
          </div>
        </div>
      </div>

      {/* Bottom Navbar */}
      <Navbar />

      {/* Custom Styles */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700&display=swap');
        .font-nunito {
          font-family: 'Nunito', sans-serif;
        }
        .text-brand {
          color: #17a34a;
        }
        .bg-brand {
          background-color: #17a34a;
        }
        .bg-brand-light {
          background-color: #e6f4ea;
        }
        .hover\:text-brand-dark:hover {
          color: #13863b;
        }
        .hover\:bg-brand-dark:hover {
          background-color: #13863b;
        }
      `}</style>
    </div>
  );
};

export default Wallet;
