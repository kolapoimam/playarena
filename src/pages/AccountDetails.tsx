import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Mail, Lock } from "lucide-react";
import Navbar from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";

const AccountDetails = ({ profile, setProfile }) => {
  const navigate = useNavigate();

  // Fallback values to ensure no empty fields
  const userProfile = profile || {
    first_name: "John",
    last_name: "Doe",
    nickname: "Johnny",
    phone_number: "08012345678",
    email: "user@example.com",
    state: "Lagos",
    skill_level: "Intermediate",
    gender: "male",
    date_of_birth: "2000-01-01",
  };

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
            <h1 className="text-2xl font-bold">Account Details</h1>
          </div>
          <div className="w-10"></div>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FormLabel className="text-gray-700 dark:text-gray-300">First Name</FormLabel>
                  <Input
                    value={userProfile.first_name}
                    disabled
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                </div>
                <div>
                  <FormLabel className="text-gray-700 dark:text-gray-300">Last Name</FormLabel>
                  <Input
                    value={userProfile.last_name}
                    disabled
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <FormLabel className="text-gray-700 dark:text-gray-300">Nickname</FormLabel>
                <Input
                  value={userProfile.nickname}
                  className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                />
              </div>
              <div>
                <FormLabel className="text-gray-700 dark:text-gray-300">Phone Number</FormLabel>
                <Input
                  value={userProfile.phone_number}
                  disabled
                  inputMode="numeric"
                  maxLength={11}
                  className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
                />
              </div>
              <div>
                <FormLabel className="text-gray-700 dark:text-gray-300">Email Address</FormLabel>
                <div className="flex items-center gap-2">
                  <Input
                    value={userProfile.email}
                    disabled
                    className="text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="text-green-500 border-green-500 hover:bg-green-500 hover:text-white rounded-lg"
                  >
                    <Mail size={16} className="mr-2" />
                    Change
                  </Button>
                </div>
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full text-green-500 border-green-500 hover:bg-green-500 hover:text-white rounded-lg"
                >
                  <Lock size={16} className="mr-2" />
                  Reset Password
                </Button>
              </div>
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

export default AccountDetails;
