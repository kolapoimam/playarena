import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { Seo } from "@/components/Seo";

import { BackButton } from "@/components/sc/ui";
const TermsAndPrivacy = () => {
  const [activeTab, setActiveTab] = useState("terms");
  const navigate = useNavigate();

  return (
    <>
      <Seo
        title="Terms & Privacy | Sport Cliq"
        description="Read the terms of service and privacy policy for Sport Cliq."
        url={window.location.href}
        image={undefined}
        children={null}
      />
      <div className="min-h-screen pb-20 bg-sc-bg dark:bg-gray-900">
        <header className="px-5 pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="pt-3 flex items-center justify-between gap-3">
            <BackButton />
            <h1 className="m-0 flex-1 text-center text-[17px] font-extrabold truncate">Terms and privacy</h1>
            <div className="min-w-11 flex justify-end"></div>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-6">
          <Card className="bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-sc-line dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-sc-ink dark:text-gray-100">
                Terms of Service & Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-sc-soft2 dark:bg-gray-700 rounded-lg p-1 mb-6">
                  <TabsTrigger
                    value="terms"
                    className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Terms of Service
                  </TabsTrigger>
                  <TabsTrigger
                    value="privacy"
                    className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm hover:bg-green-50 dark:hover:bg-gray-700 transition-all"
                  >
                    Privacy Policy
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="terms">
                  <div className="space-y-6 text-sc-ink2 dark:text-gray-300">
                    <section>
                      <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
                      <p>
                        By accessing or using Sport Cliq ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). These Terms govern your use of the Platform, including all features, services, and content provided by Sport Cliq, a platform operating in Nigeria. If you do not agree with these Terms, you must not use the Platform.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">2. Eligibility</h2>
                      <p>
                        You must be at least 18 years old or have parental consent to use the Platform. By using Sport Cliq, you represent and warrant that you meet these eligibility requirements and that all information you provide is accurate and truthful.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">3. Platform Services</h2>
                      <p>
                        Sport Cliq provides a platform for organizing, joining, and managing sports activities and venues in Nigeria, including football matches and group rides. Services include:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Creating and managing activities such as matches and rides (public or private).</li>
                        <li>Booking venues and holding venue time with booking codes.</li>
                        <li>Facilitating payments for paid activities.</li>
                        <li>Providing tools for check-in, activity management and cashouts.</li>
                      </ul>
                      <p>
                        You must be signed in to a Sport Cliq account to organize an activity, host a ride or book a venue. Players and riders can join activities without an account.
                      </p>
                      <p>
                        Sport Cliq reserves the right to modify or discontinue any service at any time without prior notice.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">4. User Responsibilities</h2>
                      <p>
                        As a user, you agree to:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Use the Platform in compliance with all applicable Nigerian laws, including the Cybercrimes (Prohibition, Prevention, Etc.) Act 2015.</li>
                        <li>Not engage in fraudulent activities, such as misrepresenting match details or payment information.</li>
                        <li>Maintain the confidentiality of your Super Code or Player Code and not share it with unauthorized parties.</li>
                        <li>Respect other users, including organizers, players, and venue owners.</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">5. Payments and Fees</h2>
                      <p>
                        For paid activities such as matches and rides, Sport Cliq facilitates payments through secure third-party providers. Organizers and hosts pay no platform fee on their first 2 paid activities. After that, a 5% platform fee applies to every paid activity. Venue owners pay no fee on their first paid booking, then a 10% referral fee applies to each paid booking made through the Platform. Fees are deducted before cashout. All fees are non-refundable unless otherwise stated in our Refund Policy.
                      </p>
                      <p>
                        Refunds for players are subject to the following:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Full refund if canceled 1 hour before the match start time.</li>
                        <li>50% refund if canceled within 1 hour of the match start time.</li>
                        <li>No refunds for checked-in players after the match starts.</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">6. Intellectual Property</h2>
                      <p>
                        All content on the Platform, including logos, designs, and software, is the property of Sport Cliq or its licensors. You may not copy, modify, or distribute any content without prior written consent from Sport Cliq.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">7. Limitation of Liability</h2>
                      <p>
                        Sport Cliq is not liable for any injuries, damages, or losses incurred during matches or at venues booked through the Platform. Users participate at their own risk. Sport Cliq is not responsible for disputes between users, including organizers, players, or venue owners.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">8. Termination</h2>
                      <p>
                        Sport Cliq may suspend or terminate your access to the Platform if you violate these Terms or engage in conduct that harms the Platform or other users. You may terminate your use of the Platform at any time by ceasing to access it.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">9. Governing Law</h2>
                      <p>
                        These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes arising from these Terms shall be resolved in the courts of Lagos, Nigeria.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">10. Contact Information</h2>
                      <p>
                        For questions or concerns about these Terms, contact us on X at <a href="https://x.com/SportCliq" className="text-sc-green-dark hover:underline" target="_blank" rel="noopener noreferrer">@SportCliq</a> or email us at sportcliqapp@gmail.com.
                      </p>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value="privacy">
                  <div className="space-y-6 text-sc-ink2 dark:text-gray-300">
                    <section>
                      <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
                      <p>
                        Sport Cliq ("we", "us", or "our") is committed to protecting your privacy in accordance with the Nigeria Data Protection Regulation (NDPR) 2019. This Privacy Policy explains how we collect, use, store, and protect your personal data when you use our Platform.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">2. Data We Collect</h2>
                      <p>
                        We collect the following types of personal data:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li><strong>Identity Data:</strong> Name, email address, phone number, and gender (optional).</li>
                        <li><strong>Payment Data:</strong> Bank account details for organizers and venue owners requesting cashouts, processed securely via third-party payment providers.</li>
                        <li><strong>Usage Data:</strong> Information about how you use the Platform, such as match bookings, venue interactions, and search history.</li>
                        <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies (with your consent).</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">3. How We Use Your Data</h2>
                      <p>
                        We use your personal data to:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li>Provide and improve Platform services, such as match organization and venue booking.</li>
                        <li>Verify identities during player check-in to prevent fraud.</li>
                        <li>Process payments and cashout requests.</li>
                        <li>Communicate with you, including notifications about matches and support inquiries.</li>
                        <li>Analyze usage to enhance user experience and Platform functionality.</li>
                      </ul>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">4. Data Sharing</h2>
                      <p>
                        We may share your personal data with:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li><strong>Organizers:</strong> Player phone numbers are shared during check-in for verification, in compliance with GDPR and NDPR.</li>
                        <li><strong>Third-Party Providers:</strong> Payment processors and analytics services, who are NDPR-compliant.</li>
                        <li><strong>Legal Authorities:</strong> When required by Nigerian law or to protect our rights.</li>
                      </ul>
                      <p>
                        We do not sell your personal data to third parties.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">5. Data Security</h2>
                      <p>
                        We implement technical and organizational measures to protect your data, including encryption, access controls, and secure servers. However, no system is completely secure, and you use the Platform at your own risk.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
                      <p>
                        Under the NDPR, you have the following rights:
                      </p>
                      <ul className="list-disc ml-5 mt-2 space-y-1">
                        <li><strong>Access:</strong> Request a copy of your personal data.</li>
                        <li><strong>Rectification:</strong> Correct inaccurate or incomplete data.</li>
                        <li><strong>Erasure:</strong> Request deletion of your data, subject to legal obligations.</li>
                        <li><strong>Restriction:</strong> Limit how we process your data.</li>
                        <li><strong>Objection:</strong> Object to certain data processing activities.</li>
                        <li><strong>Data Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                      </ul>
                      <p>
                        To exercise these rights, contact us at sportcliqapp@gmail.com.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">7. Data Retention</h2>
                      <p>
                        We retain personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy or as required by Nigerian law. For example, payment data may be retained for 7 years to comply with tax obligations.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">8. Cookies</h2>
                      <p>
                        We use cookies to enhance your experience, such as remembering your preferences and analyzing usage. You can manage cookie preferences through your browser settings. By using the Platform, you consent to our use of essential cookies.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">9. International Data Transfers</h2>
                      <p>
                        Your data may be processed outside Nigeria by our service providers (e.g., cloud hosting). We ensure such providers comply with NDPR and equivalent data protection standards.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">10. Changes to This Policy</h2>
                      <p>
                        We may update this Privacy Policy to reflect changes in our practices or legal requirements. We will notify you of significant changes via email or Platform notifications.
                      </p>
                    </section>

                    <section>
                      <h2 className="text-xl font-semibold mb-2">11. Contact Information</h2>
                      <p>
                        For questions or concerns about this Privacy Policy, contact our Data Protection Officer at sportcliqapp@gmail.com or on X at <a href="https://x.com/SportCliq" className="text-sc-green-dark hover:underline" target="_blank" rel="noopener noreferrer">@SportCliq</a>.
                      </p>
                    </section>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="mt-6 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg rounded-xl border border-sc-line dark:border-gray-700">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-sc-ink2 dark:text-gray-300 mb-3">
                Need help? Reach out to us on Twitter!
              </p>
              <Button
                asChild
                className="bg-sc-green hover:brightness-95 text-sc-green-ink px-6 py-2 rounded-full transition-colors font-bold"
              >
                <a href="https://x.com/SportCliq" target="_blank" rel="noopener noreferrer">
                  Contact Us
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Navbar />
      </div>
    </>
  );
};

export default TermsAndPrivacy;
