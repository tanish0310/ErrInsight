"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import {
  Search,
  Loader2,
  RefreshCcw,
  FileCode2,
  Info,
  Bug,
  Wrench,
  ChevronDown,
  Code,
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  History,
  Square,
  CheckSquare,
  Lock,
} from "lucide-react";
import HistoryDashboard from "@/components/HistoryDashboard";
import ShareButton from "@/components/SharedButton";
import { toast } from "sonner";
import { analyzeError, checkRateLimit } from "@/services/apiService";
import { getSampleErrors, detectLanguage } from "@/utils/clientUtils";

const languages = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Java",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Go",
  "Rust",
  "Swift",
  "Kotlin",
  "SQL",
  "HTML/CSS",
  "Docker",
  "Git",
  "Linux",
  "Appwrite",
  "Other",
];

const compatibilityMap = {
  JavaScript: ["TypeScript", "React", "Next.js"],
  TypeScript: ["JavaScript", "React", "Next.js"],
  React: ["JavaScript", "TypeScript", "Next.js"],
  "Next.js": ["JavaScript", "TypeScript", "React"],
  "Node.js": ["JavaScript", "TypeScript"],
  "HTML/CSS": ["JavaScript", "React", "Next.js"],
};

const accordionItems = [
  {
    id: "explanation",
    title: "What Does This Error Mean?",
    icon: Info,
    loadingText: "Analyzing error...",
    color: "blue",
  },
  {
    id: "causes",
    title: "What Caused This Error?",
    icon: Bug,
    loadingText: "Identifying causes...",
    color: "orange",
  },
  {
    id: "solutions",
    title: "How to Fix This Error?",
    icon: Wrench,
    loadingText: "Finding solutions...",
    color: "green",
  },
  {
    id: "exampleCode",
    title: "Example Code (Reproduces This Error)",
    icon: FileCode2,
    loadingText: "Generating example...",
    color: "purple",
  },
];

export default function Home() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("input");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("JavaScript");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [openAccordions, setOpenAccordions] = useState(new Set());
  const [loadingSteps, setLoadingSteps] = useState(new Set());
  const [validationError, setValidationError] = useState("");
  const [rateLimit, setRateLimit] = useState({
    remaining: 5,
    maxRequests: 5,
    resetTime: null,
    canAnalyze: true,
    loading: true,
  });
  const [isPrivate, setIsPrivate] = useState(false);

  // Get theme-aware color palette
  const getThemeColors = () => {
    if (theme === "dark") {
      return {
        primaryBg: "#CDFA8A",
        primaryText: "#0E2E28",
        textMain: "#ffffff",
        surface: "#2d2d2d",
        border: "#404040",
        muted: "#888888",
      };
    }
    return {
      primaryBg: "#0E2E28",
      primaryText: "#CDFA8A",
      textMain: "#000000",
      surface: "#ffffff",
      border: "#e5e7eb",
      muted: "#6b7280",
    };
  };

  const colors = getThemeColors();

  // Validate error message input
  const validateErrorMessage = (text) => {
    if (!text || text.trim().length < 8) {
      return {
        isValid: false,
        message: "Please enter at least 8 characters.",
      };
    }
    return { isValid: true };
  };

  // Fetch current rate limit status
  const fetchRateLimit = async () => {
    try {
      const data = await checkRateLimit();
      setRateLimit({
        remaining: data.remaining || 5,
        maxRequests: data.maxRequests || 5,
        resetTime: data.resetTime ? new Date(data.resetTime) : null,
        canAnalyze: data.canAnalyze !== false,
        loading: false,
      });
    } catch (error) {
      console.error("Error fetching rate limit:", error);
      setRateLimit((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchRateLimit();
  }, []);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest(".relative")) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Validate error message and detect language mismatches
  useEffect(() => {
    if (errorMessage.trim()) {
      const validation = validateErrorMessage(errorMessage);

      if (!validation.isValid) {
        setValidationError(
          validation.message +
            (validation.suggestion ? `\n\n${validation.suggestion}` : "")
        );
      } else {
        setValidationError("");

        const detectedLang = detectLanguage(errorMessage);
        if (
          detectedLang &&
          detectedLang !== selectedLanguage &&
          !(
            compatibilityMap[selectedLanguage]?.includes(detectedLang) ||
            compatibilityMap[detectedLang]?.includes(selectedLanguage)
          ) &&
          !["Other"].includes(selectedLanguage)
        ) {
          setValidationError(
            `This looks like a ${detectedLang} error, but you've selected ${selectedLanguage}. Consider switching languages for better analysis.`
          );
        }
      }
    } else {
      setValidationError("");
    }
  }, [errorMessage, selectedLanguage]);

  // Submit error for analysis
  const handleSubmit = async () => {
    if (!errorMessage.trim()) {
      toast.error("Please enter an error message.");
      return;
    }

    const validation = validateErrorMessage(errorMessage);
    if (!validation.isValid) {
      toast.error(validation.message);
      return;
    }

    if (!rateLimit.canAnalyze) {
      toast.error(
        "Daily limit reached (5 analyses per day). Please try again tomorrow."
      );
      return;
    }

    setIsLoading(true);
    setAnalysis(null);
    setActiveTab("output");
    setOpenAccordions(new Set());
    setLoadingSteps(new Set());
    setValidationError("");

    try {
      for (let i = 0; i < accordionItems.length; i++) {
        setLoadingSteps((prev) => new Set([...prev, accordionItems[i].id]));
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const data = await analyzeError({
        errorMessage: errorMessage.trim(),
        language: selectedLanguage,
        isPrivate: isPrivate,
      });

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
        setLoadingSteps(new Set());
        toast.success("Error analysis completed!");

        if (data.rateLimit) {
          setRateLimit((prev) => ({
            remaining: data.rateLimit.remaining,
            maxRequests: prev.maxRequests,
            resetTime: data.rateLimit.resetTime
              ? new Date(data.rateLimit.resetTime)
              : prev.resetTime,
            canAnalyze: data.rateLimit.remaining > 0,
            loading: false,
          }));
        }

        setTimeout(() => {
          setOpenAccordions(new Set(["explanation"]));
        }, 300);
      } else {
        toast.error("Failed to analyze error. Please try again.");
        setActiveTab("input");
      }
    } catch (err) {
      console.error("Error:", err);

      if (err.message.includes("Daily limit reached")) {
        toast.error(err.message);
        setRateLimit((prev) => ({
          ...prev,
          remaining: 0,
          canAnalyze: false,
        }));
      } else if (err.message.includes("does not look like an error message")) {
        toast.error(err.message);
      } else {
        toast.error("Failed to analyze error. Please try again.");
      }
      setActiveTab("input");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle accordion sections
  const toggleAccordion = (id) => {
    if (loadingSteps.has(id) || isLoading) return;

    setOpenAccordions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Insert random sample error
  const insertSampleError = () => {
    if (!rateLimit.canAnalyze) return;

    const samples = getSampleErrors(selectedLanguage);
    const randomError = samples[Math.floor(Math.random() * samples.length)];
    setErrorMessage(randomError);
  };

  // Get severity-based styling
  const getSeverityColor = (severity) => {
    switch (severity) {
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  // Get accordion color scheme
  const getAccordionColor = (color, isOpen, theme) => {
    if (theme === "dark") {
      const darkColors = {
        blue: isOpen
          ? "border-blue-600 bg-blue-900/20"
          : "border-gray-600 hover:border-blue-600",
        orange: isOpen
          ? "border-orange-600 bg-orange-900/20"
          : "border-gray-600 hover:border-orange-600",
        green: isOpen
          ? "border-green-600 bg-green-900/20"
          : "border-gray-600 hover:border-green-600",
        purple: isOpen
          ? "border-purple-600 bg-purple-900/20"
          : "border-gray-600 hover:border-purple-600",
      };
      return darkColors[color] || darkColors.blue;
    }

    const lightColors = {
      blue: isOpen
        ? "border-blue-200 bg-blue-50"
        : "border-gray-200 hover:border-blue-200",
      orange: isOpen
        ? "border-orange-200 bg-orange-50"
        : "border-gray-200 hover:border-orange-200",
      green: isOpen
        ? "border-green-200 bg-green-50"
        : "border-gray-200 hover:border-green-200",
      purple: isOpen
        ? "border-purple-200 bg-purple-50"
        : "border-gray-200 hover:border-purple-200",
    };
    return lightColors[color] || lightColors.blue;
  };

  // Get icon color for accordion items
  const getIconColor = (color) => {
    const colors = {
      blue: "text-blue-600",
      orange: "text-orange-600",
      green: "text-green-600",
      purple: "text-purple-600",
    };
    return colors[color] || colors.blue;
  };

  // Reset form for new analysis
  const handleNewAnalysis = () => {
    setActiveTab("input");
    setAnalysis(null);
    setErrorMessage("");
    setOpenAccordions(new Set());
    setLoadingSteps(new Set());
    setValidationError("");
  };

  // Handle share completion
  const handleShareComplete = (shareData) => {
    setAnalysis((prevAnalysis) => ({
      ...prevAnalysis,
      isShared: shareData.isShared,
      shareId: shareData.shareId,
    }));
  };

  // Handle error selection from history
  const handleHistoryErrorSelect = ({
    errorMessage,
    language,
    existingAnalysis,
  }) => {
    setErrorMessage(errorMessage);
    setSelectedLanguage(language);
    if (existingAnalysis) {
      setAnalysis(existingAnalysis);
      setActiveTab("output");
      setOpenAccordions(new Set(["explanation"]));
    } else {
      setActiveTab("input");
    }
  };

  // Render accordion content based on analysis type
  const renderAccordionContent = (item) => {
    if (!analysis) return null;

    const baseText = `text-sm leading-relaxed ${
      theme === "dark" ? "text-gray-200" : "text-gray-700"
    }`;

    const badgeClasses = (dark, light) =>
      `flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
        theme === "dark" ? dark : light
      }`;

    switch (item.id) {
      case "explanation":
        return analysis.explanation ? (
          <div className={baseText}>{analysis.explanation}</div>
        ) : null;

      case "causes":
        return analysis.causes?.length > 0 ? (
          <ul className="space-y-3">
            {analysis.causes.map((cause, i) => (
              <li key={i} className={`flex gap-3 ${baseText}`}>
                <span
                  className={badgeClasses(
                    "bg-orange-800 text-orange-200",
                    "bg-orange-100 text-orange-600"
                  )}
                >
                  {i + 1}
                </span>
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        ) : null;

      case "solutions":
        return analysis.solutions?.length > 0 ? (
          <ul className="space-y-3">
            {analysis.solutions.map((solution, i) => (
              <li key={i} className={`flex gap-3 ${baseText}`}>
                <span
                  className={badgeClasses(
                    "bg-green-800 text-green-200",
                    "bg-green-100 text-green-600"
                  )}
                >
                  {i + 1}
                </span>
                <span>{solution}</span>
              </li>
            ))}
          </ul>
        ) : null;

      case "exampleCode":
        return analysis.exampleCode ? (
          <div>
            <pre
              className={`font-mono p-3 rounded border overflow-x-auto whitespace-pre-wrap leading-relaxed ${
                theme === "dark"
                  ? "bg-gray-800 text-gray-100 border-gray-700"
                  : "bg-white text-gray-700 border-gray-300"
              }`}
            >
              <code>{analysis.exampleCode}</code>
            </pre>
            <p
              className={`text-xs mt-2 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              This code demonstrates how the error occurs. Compare with your
              code to understand the issue.
            </p>
          </div>
        ) : null;

      default:
        return null;
    }
  };

  // Format reset time for display
  const formatResetTime = (resetTime) => {
    if (!resetTime) return "";
    const now = new Date();
    const timeDiff = resetTime.getTime() - now.getTime();

    if (timeDiff <= 0) return "shortly";

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="px-2 sm:px-4 py-12 sm:py-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <h1
            className={`text-2xl lg:text-3xl font-semibold leading-tight tracking-wide ${
              theme === "dark" ? "text-white" : "text-[#0E2E28]"
            } mb-2`}
          >
            Turn Cryptic Errors
            <br />
            <span
              className={`text-transparent bg-clip-text ${
                theme === "dark"
                  ? "bg-gradient-to-r from-white to-gray-300"
                  : "bg-gradient-to-r from-[#0E2E28] to-[#4A7C59]"
              }`}
            >
              into Plain English
            </span>
          </h1>
          <p
            className={`${
              theme === "dark" ? "text-white/70" : "text-[#0E2E28]/70"
            } text-sm sm:text-base leading-relaxed tracking-wide max-w-2xl mx-auto`}
          >
            Instantly analyze errors • Clear explanations • Actionable fixes
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-center sm:text-left">
            {rateLimit.loading ? (
              <div
                className={`flex items-center ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Loading...
              </div>
            ) : rateLimit.canAnalyze ? (
              <div
                className={`flex flex-wrap items-center justify-center sm:justify-start ${
                  theme === "dark" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                <Clock className="w-3 h-3 mr-1" />
                <span>{rateLimit.remaining} analyses remaining today</span>
                {rateLimit.resetTime && (
                  <span
                    className={`ml-1 ${
                      theme === "dark" ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    • Resets in {formatResetTime(rateLimit.resetTime)}
                  </span>
                )}
              </div>
            ) : (
              <div
                className={`flex flex-wrap items-center justify-center sm:justify-start ${
                  theme === "dark" ? "text-red-400" : "text-red-600"
                }`}
              >
                <XCircle className="w-3 h-3 mr-1" />
                <span>Daily limit reached</span>
                {rateLimit.resetTime && (
                  <span
                    className={`ml-1 ${
                      theme === "dark" ? "text-gray-500" : "text-gray-500"
                    }`}
                  >
                    • Resets in {formatResetTime(rateLimit.resetTime)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="backdrop-blur-md rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div
            className={`border-b ${
              theme === "dark"
                ? "border-gray-600 bg-gray-800/50"
                : "border-gray-200 bg-white/50"
            }`}
          >
            <div
              className={`flex divide-x ${
                theme === "dark" ? "divide-gray-600" : "divide-gray-200"
              }`}
            >
              <button
                onClick={() => setActiveTab("input")}
                className={`group flex-1 min-w-0 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out
        ${
          activeTab === "input"
            ? `bg-[${colors.primaryBg}] text-[${colors.primaryText}]`
            : `${
                theme === "dark"
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-[#0E2E28] hover:bg-gray-100"
              } cursor-pointer`
        }`}
                style={
                  activeTab === "input"
                    ? {
                        backgroundColor: colors.primaryBg,
                        color: colors.primaryText,
                      }
                    : {}
                }
              >
                <Code className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:scale-110" />
                <span className="hidden sm:inline truncate">Error Input</span>
                <span className="sm:hidden truncate">Input</span>
              </button>

              <button
                onClick={() =>
                  (analysis || isLoading) && setActiveTab("output")
                }
                disabled={!analysis && !isLoading}
                className={`group flex-1 min-w-0 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out
        ${
          activeTab === "output" && (analysis || isLoading)
            ? `bg-[${colors.primaryBg}] text-[${colors.primaryText}]`
            : analysis || isLoading
            ? `${
                theme === "dark"
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-[#0E2E28] hover:bg-gray-100"
              } cursor-pointer`
            : `${
                theme === "dark" ? "text-gray-600" : "text-gray-400"
              } cursor-not-allowed`
        }`}
                style={
                  activeTab === "output" && (analysis || isLoading)
                    ? {
                        backgroundColor: colors.primaryBg,
                        color: colors.primaryText,
                      }
                    : {}
                }
              >
                <BarChart3 className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:scale-110" />
                <span className="hidden sm:inline truncate">
                  Analysis Results
                </span>
                <span className="sm:hidden truncate">Results</span>
              </button>

              <button
                onClick={() => setActiveTab("history")}
                className={`group flex-1 min-w-0 flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-200 ease-in-out
        ${
          activeTab === "history"
            ? `bg-[${colors.primaryBg}] text-[${colors.primaryText}]`
            : `${
                theme === "dark"
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-[#0E2E28] hover:bg-gray-100"
              } cursor-pointer`
        }`}
                style={
                  activeTab === "history"
                    ? {
                        backgroundColor: colors.primaryBg,
                        color: colors.primaryText,
                      }
                    : {}
                }
              >
                <History className="w-4 h-4 transition-transform duration-200 ease-in-out group-hover:scale-110" />
                <span className="hidden sm:inline truncate">Error History</span>
                <span className="sm:hidden truncate">History</span>
              </button>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === "input" && (
              <div className="space-y-6">
                {!rateLimit.canAnalyze && !rateLimit.loading && (
                  <div
                    className={`p-4 rounded-xl ${
                      theme === "dark"
                        ? "bg-red-900/20 border-red-700"
                        : "bg-red-50 border-red-200"
                    } border`}
                  >
                    <div className="flex items-start gap-3">
                      <XCircle
                        className={`w-5 h-5 ${
                          theme === "dark" ? "text-red-400" : "text-red-600"
                        } mt-0.5 flex-shrink-0`}
                      />
                      <div>
                        <h3
                          className={`text-sm font-medium ${
                            theme === "dark" ? "text-red-400" : "text-red-800"
                          } mb-1`}
                        >
                          Daily Limit Reached
                        </h3>
                        <p
                          className={`text-sm ${
                            theme === "dark" ? "text-red-300" : "text-red-700"
                          } leading-relaxed`}
                        >
                          You've used all 5 error analyses for today.
                          {rateLimit.resetTime && (
                            <span>
                              {" "}
                              Your limit will reset in{" "}
                              {formatResetTime(rateLimit.resetTime)}.
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label
                    className={`block font-medium text-sm ${
                      theme === "dark" ? "text-white" : "text-[#0E2E28]"
                    } mb-2`}
                  >
                    Language / Framework
                  </label>
                  <div className="relative">
                    <button
                      onClick={() =>
                        rateLimit.canAnalyze &&
                        setIsDropdownOpen(!isDropdownOpen)
                      }
                      disabled={!rateLimit.canAnalyze}
                      className={`cursor-pointer w-full px-3 py-3 text-sm rounded-xl border ${
                        theme === "dark" ? "bg-gray-800" : "bg-white"
                      } focus:ring-2 focus:ring-[#CDFA8A] focus:outline-none transition flex items-center justify-between text-left ${
                        rateLimit.canAnalyze
                          ? `${
                              theme === "dark"
                                ? "border-gray-600 text-white hover:border-gray-500"
                                : "border-gray-300 cursor-pointer hover:border-gray-400"
                            }`
                          : `${
                              theme === "dark"
                                ? "border-gray-700 bg-gray-900 text-gray-500"
                                : "border-gray-200 cursor-not-allowed bg-gray-50 text-gray-400"
                            }`
                      }`}
                    >
                      <span>{selectedLanguage}</span>
                      <ChevronDown
                        className={`w-5 h-5 ${
                          theme === "dark" ? "text-gray-400" : "text-gray-400"
                        } transition-transform ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isDropdownOpen && rateLimit.canAnalyze && (
                      <div
                        className={`absolute top-full left-0 right-0 mt-1 ${
                          theme === "dark"
                            ? "bg-gray-800 border-gray-600"
                            : "bg-white border-gray-300"
                        } border rounded-xl shadow-lg z-10 max-h-50 overflow-y-auto`}
                      >
                        {languages.map((lang) => (
                          <button
                            key={lang}
                            onClick={() => {
                              setSelectedLanguage(lang);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2.5 text-sm text-left transition-colors cursor-pointer first:rounded-t-xl last:rounded-b-xl ${
                              lang === selectedLanguage
                                ? `bg-[${colors.primaryBg}] text-[${colors.primaryText}] font-medium`
                                : `${
                                    theme === "dark"
                                      ? "text-white hover:bg-gray-700"
                                      : "hover:bg-gray-50"
                                  }`
                            }`}
                            style={
                              lang === selectedLanguage
                                ? {
                                    backgroundColor: colors.primaryBg,
                                    color: colors.primaryText,
                                  }
                                : {}
                            }
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className={`block font-medium text-sm ${
                        theme === "dark" ? "text-white" : "text-[#0E2E28]"
                      }`}
                    >
                      Error Message
                    </label>
                    {rateLimit.canAnalyze && (
                      <button
                        onClick={insertSampleError}
                        className={`text-sm ${
                          theme === "dark"
                            ? "text-blue-400 hover:text-blue-300"
                            : "text-blue-600 hover:text-blue-700"
                        } hover:underline cursor-pointer transition-colors duration-200 font-medium`}
                      >
                        Try sample error
                      </button>
                    )}
                  </div>
                  <textarea
                    value={errorMessage}
                    onChange={(e) =>
                      rateLimit.canAnalyze && setErrorMessage(e.target.value)
                    }
                    disabled={!rateLimit.canAnalyze}
                    placeholder={
                      rateLimit.canAnalyze
                        ? `Paste your error message here...\n\nExample:\nTypeError: Cannot read property 'map' of undefined\nReferenceError: document is not defined`
                        : "Daily limit reached. Please try again tomorrow."
                    }
                    rows={8}
                    maxLength={1000}
                    className={`w-full px-3 py-3 text-sm rounded-xl border resize-none focus:ring-2 focus:ring-[#CDFA8A] focus:outline-none transition
    ${
      !rateLimit.canAnalyze
        ? `${
            theme === "dark"
              ? "border-gray-700 bg-gray-900 text-gray-500 placeholder-gray-500"
              : "border-gray-200 bg-gray-50 text-gray-400 placeholder-gray-400"
          } cursor-not-allowed`
        : validationError
        ? `${
            theme === "dark"
              ? "border-red-600 bg-red-900/20 placeholder-red-300"
              : "border-red-300 bg-red-50 placeholder-red-400"
          }`
        : errorMessage && validateErrorMessage(errorMessage)
        ? `${
            theme === "dark"
              ? "border-green-600 bg-green-900/20 placeholder-green-300"
              : "border-green-300 bg-green-50 placeholder-green-400"
          }`
        : `${
            theme === "dark"
              ? "border-gray-600 bg-gray-800 text-white placeholder-gray-400"
              : "border-gray-300 bg-white text-black placeholder-gray-500"
          }`
    }`}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs mt-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {errorMessage.length}/1000
                      </span>
                      {rateLimit.canAnalyze &&
                        errorMessage &&
                        validateErrorMessage(errorMessage) && (
                          <div
                            className={`flex items-center gap-1 ${
                              theme === "dark"
                                ? "text-green-400"
                                : "text-green-600"
                            }`}
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Valid error detected</span>
                          </div>
                        )}
                    </div>

                    <label className="flex items-center gap-2 text-xs sm:text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="sr-only"
                      />
                      {isPrivate ? (
                        <CheckSquare
                          className={`w-4 h-4`}
                          style={{
                            color: colors.primaryBg,
                            fill: colors.primaryText,
                          }}
                        />
                      ) : (
                        <Square
                          className={`w-4 h-4`}
                          style={{ color: colors.primaryBg }}
                        />
                      )}
                      <span
                        className={`${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Don't save to history
                      </span>
                    </label>

                    {errorMessage.length > 900 && (
                      <span
                        className={`${
                          theme === "dark"
                            ? "text-orange-400"
                            : "text-orange-600"
                        }`}
                      >
                        Approaching limit
                      </span>
                    )}
                  </div>

                  {validationError && (
                    <div
                      className={`mt-3 p-3 rounded-lg ${
                        theme === "dark"
                          ? "bg-red-900/20 border-red-700"
                          : "bg-red-50 border-red-200"
                      } border`}
                    >
                      <div className="flex items-start gap-2">
                        ⚠️
                        <div
                          className={`text-sm ${
                            theme === "dark" ? "text-red-300" : "text-red-700"
                          } leading-relaxed whitespace-pre-line`}
                        >
                          {validationError}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {!errorMessage && rateLimit.canAnalyze && (
                  <div
                    className={`mt-4 p-3 rounded-xl border ${
                      theme === "dark"
                        ? "border-blue-600 bg-blue-900/20"
                        : "border-blue-200 bg-blue-50"
                    }`}
                  >
                    <div
                      className={`flex items-start gap-2 text-sm ${
                        theme === "dark" ? "text-blue-300" : "text-blue-700"
                      }`}
                    >
                      <span className="mt-0.5 text-base">💡</span>
                      <div>
                        <span className="font-semibold">Tip:</span> Paste error
                        messages containing keywords like{" "}
                        <code
                          className={`px-1 py-0.5 ${
                            theme === "dark"
                              ? "bg-blue-800 text-blue-200"
                              : "bg-blue-100 text-blue-800"
                          } rounded`}
                        >
                          Error:
                        </code>
                        ,{" "}
                        <code
                          className={`px-1 py-0.5 ${
                            theme === "dark"
                              ? "bg-blue-800 text-blue-200"
                              : "bg-blue-100 text-blue-800"
                          } rounded`}
                        >
                          Exception:
                        </code>
                        , or full stack traces for best results.
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={
                    !errorMessage.trim() ||
                    !!validationError ||
                    isLoading ||
                    !rateLimit.canAnalyze
                  }
                  className={`w-full font-medium py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition transform ${
                    rateLimit.canAnalyze &&
                    !validationError &&
                    errorMessage.trim()
                      ? `cursor-pointer hover:scale-[1.02] active:scale-[0.98]`
                      : `${
                          theme === "dark"
                            ? "bg-gray-700 text-gray-500"
                            : "bg-gray-200 text-gray-500"
                        } cursor-not-allowed`
                  }`}
                  style={
                    rateLimit.canAnalyze &&
                    !validationError &&
                    errorMessage.trim()
                      ? {
                          backgroundColor: colors.primaryBg,
                          color: colors.primaryText,
                        }
                      : {}
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : !rateLimit.canAnalyze ? (
                    <>
                      <XCircle className="w-4 h-4" />
                      Daily Limit Reached
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Analyze Error
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === "output" && (
              <div className="space-y-6">
                {analysis || isLoading ? (
                  <>
                    {analysis && (
                      <div
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-2 ${
                          theme === "dark"
                            ? "bg-gray-800/60 border-gray-600"
                            : "bg-white/60 border-[#e6e6e6]"
                        } rounded-xl border`}
                      >
                        <div>
                          <h2
                            className={`text-lg font-medium ${
                              theme === "dark" ? "text-white" : "text-[#0E2E28]"
                            } mb-1`}
                          >
                            Error Analysis Complete
                          </h2>
                          <div
                            className={`flex items-center gap-2 text-sm ${
                              theme === "dark"
                                ? "text-gray-300"
                                : "text-[#0E2E28]/70"
                            }`}
                          >
                            <FileCode2 className="w-4 h-4" />
                            <span>{analysis.language}</span> •{" "}
                            <span>{analysis.category}</span>
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 text-center rounded-full border text-sm font-medium ${getSeverityColor(
                            analysis.severity
                          )}`}
                        >
                          {analysis.severity} severity
                        </span>
                      </div>
                    )}

                    <div className="space-y-4">
                      {accordionItems.map((item) => {
                        const isOpen = openAccordions.has(item.id);
                        const isLoadingItem = loadingSteps.has(item.id);
                        const hasContent = renderAccordionContent(item);
                        const isDisabled =
                          !hasContent && !isLoadingItem && !isLoading;

                        return (
                          <div
                            key={item.id}
                            className={`rounded-xl border cursor-pointer transition ${getAccordionColor(
                              item.color,
                              isOpen,
                              theme
                            )} ${isDisabled ? "opacity-50" : ""}`}
                          >
                            <button
                              onClick={() => toggleAccordion(item.id)}
                              disabled={isDisabled}
                              className={`w-full p-2.5 flex items-center cursor-pointer justify-between text-left rounded-xl hover:bg-black/5 transition disabled:cursor-not-allowed`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-1.5 rounded-lg ${
                                    theme === "dark"
                                      ? "bg-gray-700"
                                      : "bg-white"
                                  } shadow-sm ${getIconColor(item.color)}`}
                                >
                                  <item.icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <h3
                                    className={`font-medium ${
                                      theme === "dark"
                                        ? "text-white"
                                        : "text-gray-900"
                                    }`}
                                  >
                                    {item.title}
                                  </h3>
                                  {isLoadingItem && (
                                    <p
                                      className={`text-sm ${
                                        theme === "dark"
                                          ? "text-gray-400"
                                          : "text-gray-500"
                                      } mt-1`}
                                    >
                                      Processing...
                                    </p>
                                  )}
                                </div>
                              </div>
                              {!isDisabled &&
                                (isLoadingItem ? (
                                  <Loader2
                                    className={`w-5 h-5 animate-spin ${
                                      theme === "dark"
                                        ? "text-gray-500"
                                        : "text-gray-400"
                                    }`}
                                  />
                                ) : (
                                  <ChevronDown
                                    className={`w-5 h-5 ${
                                      theme === "dark"
                                        ? "text-gray-500"
                                        : "text-gray-400"
                                    } transition-transform ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                ))}
                            </button>

                            {(isOpen || isLoadingItem) && (
                              <div className="px-4">
                                <div
                                  className={
                                    hasContent && !isLoadingItem ? "py-4" : ""
                                  }
                                >
                                  {renderAccordionContent(item)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {analysis && !isLoading && (
                      <div
                        className={`flex flex-col sm:flex-row gap-3 pt-4 border-t ${
                          theme === "dark"
                            ? "border-gray-600"
                            : "border-gray-200"
                        } justify-center`}
                      >
                        {rateLimit?.canAnalyze && (
                          <button
                            onClick={handleNewAnalysis}
                            className={`font-medium py-2 px-4 cursor-pointer rounded-xl flex items-center justify-center gap-2 text-sm transition transform hover:scale-[1.02] active:scale-[0.98]`}
                            style={{
                              backgroundColor: colors.primaryBg,
                              color: colors.primaryText,
                            }}
                          >
                            <RefreshCcw className="w-4 h-4" />
                            Analyze Another Error
                          </button>
                        )}

                        {analysis.id && (
                          <ShareButton
                            errorId={analysis.id}
                            isShared={analysis.isShared}
                            existingShareId={analysis.shareId}
                            isPrivate={analysis.isPrivate}
                            onShareComplete={handleShareComplete}
                          />
                        )}

                        {analysis.isPrivate && (
                          <div
                            className={`text-xs font-medium ${
                              theme === "dark"
                                ? "text-[#CDFA8A]"
                                : "text-[#0E2E28]"
                            } flex items-center justify-center gap-1 px-3 py-2 rounded-xl border text-center ${
                              theme === "dark"
                                ? "border-gray-600 bg-gray-800/30"
                                : "border-gray-200 bg-gray-50"
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            <span>Private analysis</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div
                      className={`w-16 h-16 ${
                        theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                      } rounded-full flex items-center justify-center mx-auto mb-4`}
                    >
                      <BarChart3
                        className={`w-8 h-8 ${
                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                        }`}
                      />
                    </div>
                    <h3
                      className={`text-lg font-medium ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      } mb-2`}
                    >
                      No Analysis Yet
                    </h3>
                    <p
                      className={`${
                        theme === "dark" ? "text-gray-300" : "text-gray-600"
                      } mb-6`}
                    >
                      Submit an error message to see the detailed analysis here.
                    </p>
                    <button
                      onClick={() => setActiveTab("input")}
                      className={`font-medium py-2 px-4 rounded-xl transition`}
                      style={{
                        backgroundColor: colors.primaryBg,
                        color: colors.primaryText,
                      }}
                    >
                      Go to Input Tab
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <HistoryDashboard onSelectError={handleHistoryErrorSelect} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
