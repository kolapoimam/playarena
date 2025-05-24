import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

const Wallet = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      <header className="p-4 bg-gradient-to-r from-green-500 to-green-700 text-white rounded-b-2xl shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="text-white hover:bg-green-600"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold">Wallet</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="relative">
            <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden opacity-50 pointer-events-none">
              <CardContent className="p-6">
                <div className="flex flex-col items-center mb-4">
                  <img
                    src={document.documentElement.classList.contains("dark") ? "/playarenadark.png" : "/playarenalight.png"}
                    alt="PlayArena Logo"
                    className="w-24 h-24 object-contain mb-4"
                  />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Wallet Balance</h2>
                  <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">₦0.00</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Available Balance</p>
                </div>
                <div className="flex space-x-4">
                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg px-4 py-2 text-sm"
                    disabled
                  >
                    Add Funds
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-4 py-2 text-sm"
                    disabled
                  >
                    Withdraw
                  </Button>
                </div>
              </CardContent>
            </Card>
            <div className="absolute inset-0 flex items-center justify-center">
              <h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-400">Coming Soon</h2>
            </div>
          </div>
        </div>
      </div>

      <div className="pb-28">
        <Navbar />
      </div>
    </div>
  );
};

export default Wallet;
