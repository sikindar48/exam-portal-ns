import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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
  Zap,
  Globe,
  Lock,
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Secure Testing",
      description:
        "Advanced security measures to ensure exam integrity and prevent cheating",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Timed Assessments",
      description:
        "Flexible timing controls with auto-submission and time tracking",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Multi-User Management",
      description:
        "Separate dashboards for administrators, instructors, and students",
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Detailed Analytics",
      description:
        "Comprehensive reports and analytics for performance tracking",
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "Question Bank",
      description:
        "Organize questions by categories with bulk import capabilities",
    },
    {
      icon: <Award className="h-6 w-6" />,
      title: "Instant Results",
      description:
        "Automated grading with immediate feedback and detailed scorecards",
    },
  ];

  const benefits = [
    "Easy test creation and management",
    "Real-time test monitoring",
    "Automated grading and scoring",
    "Mobile-friendly interface",
    "CSV question import support",
    "Customizable test settings",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  NS Exam Portal
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  by NS Software Solutions
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
          >
            <Zap className="h-3 w-3 mr-1" />
            Professional Online Testing Platform
          </Badge>

          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-slate-100 mb-6 leading-tight">
            Conduct Secure
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              {" "}
              Online Exams
            </span>
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-3xl mx-auto leading-relaxed">
            A comprehensive online examination platform designed for educational
            institutions. Create, manage, and conduct secure assessments with
            ease.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/join")}
              className="text-lg px-8 py-6 border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-white w-full sm:w-auto"
            >
              <Users className="mr-2 h-5 w-5" />
              Join Test
            </Button>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-12">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400 mx-auto mb-3">
                <Shield className="h-6 w-6" />
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Secure Testing
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Advanced security measures
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg text-indigo-600 dark:text-indigo-400 mx-auto mb-3">
                <Clock className="h-6 w-6" />
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Flexible Timing
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Custom time controls
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg text-green-600 dark:text-green-400 mx-auto mb-3">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Detailed Analytics
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Comprehensive reports
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-white dark:bg-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Powerful Features for Modern Education
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Everything you need to create, manage, and analyze online
              assessments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400 flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">
                        {feature.title}
                      </CardTitle>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                Why Choose NS Exam Portal?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                A modern platform designed to simplify online testing for
                schools, colleges, and training institutes.
              </p>

              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 text-white">
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="h-8 w-8" />
                  <div>
                    <h3 className="text-xl font-semibold">
                      Accessible Anywhere
                    </h3>
                    <p className="text-blue-100">
                      Access from any device, anytime
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <Lock className="h-8 w-8" />
                  <div>
                    <h3 className="text-xl font-semibold">Secure Platform</h3>
                    <p className="text-blue-100">
                      Protected data and secure testing
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8" />
                  <div>
                    <h3 className="text-xl font-semibold">
                      Performance Insights
                    </h3>
                    <p className="text-blue-100">Track and analyze results</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Create your account and start conducting online assessments today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6 w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/join")}
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6 w-full sm:w-auto"
            >
              <Users className="mr-2 h-5 w-5" />
              Take a Test
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-slate-400">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand Section */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg flex-shrink-0">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">NS Exam Portal</div>
                  <div className="text-sm">by NS Software Solutions</div>
                </div>
              </div>
              <p className="text-sm">Professional Online Testing Platform</p>
            </div>

            {/* Quick Links */}
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-white mb-3">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/join"
                    className="hover:text-white transition-colors inline-block"
                  >
                    Join Test
                  </a>
                </li>
                <li>
                  <a
                    href="/auth"
                    className="hover:text-white transition-colors inline-block"
                  >
                    Get Started
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Links */}
            <div className="text-center md:text-left">
              <h3 className="font-semibold text-white mb-3">Company</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://www.nssoftwaresolutions.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-block"
                  >
                    NS Software Solutions
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-6 text-center">
            <p className="text-sm">
              © 2024 NS Software Solutions. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
