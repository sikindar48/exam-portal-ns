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
    "Easy test creation with drag-and-drop interface",
    "Real-time monitoring during exams",
    "Automated grading and result generation",
    "Mobile-responsive design for any device",
    "Bulk question import via CSV",
    "Customizable test settings and permissions",
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
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="text-slate-600 hover:text-slate-900"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-blue-600 hover:bg-blue-700"
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
            Streamline your assessment process with our comprehensive exam
            management platform. Create, manage, and analyze tests with
            enterprise-grade security and reliability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/join")}
              className="text-lg px-8 py-6 border-2"
            >
              <Users className="mr-2 h-5 w-5" />
              Join Test
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                10,000+
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Tests Conducted
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-600 mb-2">
                99.9%
              </div>
              <div className="text-slate-600 dark:text-slate-400">
                Uptime Reliability
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">500+</div>
              <div className="text-slate-600 dark:text-slate-400">
                Educational Institutions
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
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-400">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
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
                Built by educators for educators, our platform combines ease of
                use with enterprise-grade security and comprehensive analytics.
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
                      Global Accessibility
                    </h3>
                    <p className="text-blue-100">
                      Available 24/7 from anywhere
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-6">
                  <Lock className="h-8 w-8" />
                  <div>
                    <h3 className="text-xl font-semibold">
                      Bank-Grade Security
                    </h3>
                    <p className="text-blue-100">
                      End-to-end encryption & monitoring
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8" />
                  <div>
                    <h3 className="text-xl font-semibold">
                      Advanced Analytics
                    </h3>
                    <p className="text-blue-100">
                      Detailed insights & reporting
                    </p>
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
            Ready to Transform Your Testing Process?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of educators who trust NS Exam Portal for their
            assessment needs. Start your free trial today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8 py-6"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/join")}
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 text-lg px-8 py-6"
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
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-white">NS Exam Portal</div>
                <div className="text-sm">by NS Software Solutions</div>
              </div>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm">
                © 2024 NS Software Solutions. All rights reserved.
              </p>
              <p className="text-xs mt-1">
                Professional Online Testing Platform
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
