import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  Shield,
  Clock,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Award,
  Monitor,
  FileText,
  Settings,
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Secure Testing Environment",
      description:
        "Advanced proctoring and anti-cheating measures ensure exam integrity with real-time monitoring and secure browser technology.",
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Flexible Scheduling",
      description:
        "Schedule exams with custom time limits, multiple attempts, and automated start/end times for seamless administration.",
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Comprehensive Analytics",
      description:
        "Detailed performance reports, question analysis, and student progress tracking with exportable data insights.",
    },
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: "Question Bank Management",
      description:
        "Organize questions by categories, difficulty levels, and subjects with bulk import/export capabilities.",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Multi-Role Access",
      description:
        "Separate dashboards for super admins, client admins, instructors, and students with role-based permissions.",
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Automated Grading",
      description:
        "Instant result calculation with detailed scorecards, performance analytics, and automated certificate generation.",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  NS Exam Portal
                </h1>
                <p className="text-sm text-gray-600">
                  Professional Online Testing Platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/join")}
                variant="outline"
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <Users className="mr-2 h-4 w-4" />
                Take a Test
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge
                variant="secondary"
                className="mb-6 bg-blue-100 text-blue-800 border-blue-200"
              >
                <Monitor className="h-3 w-3 mr-2" />
                Enterprise-Grade Testing Platform
              </Badge>

              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Professional
                <br />
                <span className="text-blue-600">Online Examinations</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                Streamline your assessment process with our comprehensive exam
                management platform. Trusted by educational institutions and
                corporations worldwide for secure, reliable testing.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/join")}
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg"
                >
                  <Users className="mr-2 h-5 w-5" />
                  Join Test Session
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    15,000+
                  </div>
                  <div className="text-sm text-gray-600">Tests Conducted</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    99.9%
                  </div>
                  <div className="text-sm text-gray-600">Uptime SLA</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    500+
                  </div>
                  <div className="text-sm text-gray-600">Organizations</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-200">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Live Exam Dashboard
                    </h3>
                    <p className="text-sm text-gray-600">
                      Real-time monitoring
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-sm font-medium text-gray-900">
                      Active Students
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      247
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-sm font-medium text-gray-900">
                      Completed Tests
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      1,834
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <span className="text-sm font-medium text-gray-900">
                      Average Score
                    </span>
                    <span className="text-lg font-bold text-orange-600">
                      87.3%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Complete Testing Solution
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to create, manage, and analyze professional
              online assessments with enterprise-grade security and reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border border-gray-200 hover:shadow-lg transition-shadow duration-300 bg-white"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-xl text-blue-600 flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl text-gray-900 mb-2">
                        {feature.title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of educators and organizations who trust NS Exam
            Portal for their assessment needs. Start your free trial today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/join")}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold"
            >
              <Users className="mr-2 h-5 w-5" />
              Take a Test
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white text-lg">
                    NS Exam Portal
                  </div>
                  <div className="text-sm">by NS Software Solutions</div>
                </div>
              </div>
              <p className="text-gray-400 max-w-md">
                Professional online testing platform trusted by educational
                institutions and corporations worldwide for secure, reliable
                assessments.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/auth"
                    className="hover:text-white transition-colors"
                  >
                    Admin Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href="/join"
                    className="hover:text-white transition-colors"
                  >
                    Take Test
                  </a>
                </li>
                <li>
                  <a
                    href="/auth"
                    className="hover:text-white transition-colors"
                  >
                    Create Account
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://www.nssoftwaresolutions.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    NS Software Solutions
                  </a>
                </li>
                <li>
                  <a
                    href="https://internships.nssoftwaresolutions.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Internships
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">
              © 2024 NS Software Solutions. All rights reserved.
            </p>
            <p className="text-sm mt-2 md:mt-0">
              Professional Online Testing Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
