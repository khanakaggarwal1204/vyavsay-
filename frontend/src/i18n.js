export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "mr", label: "मराठी" },
];

const messages = {
  hi: {
    Dashboard: "डैशबोर्ड", Challenges: "चुनौतियां", "Startup Marketplace": "स्टार्टअप मार्केटप्लेस",
    Evaluations: "मूल्यांकन", Pilots: "पायलट", Contracts: "अनुबंध", Payments: "भुगतान",
    Validation: "सत्यापन", "Scale-Up": "विस्तार", Templates: "टेम्पलेट",
    "Search challenges, startups, departments…": "चुनौतियां, स्टार्टअप, विभाग खोजें…",
    "Sign in": "साइन इन", Register: "पंजीकरण", "Sign out": "साइन आउट",
    "Challenge Identification": "चुनौती पहचान", "Turn a complaint into a buildable challenge": "शिकायत को कार्यान्वित चुनौती में बदलें",
    "Plain-language problem": "सरल भाषा में समस्या", "Structured specification": "संरचित विनिर्देश",
    "Pilot and budget": "पायलट और बजट", "Measurement plan": "मापन योजना", Publish: "प्रकाशित करें",
    Back: "वापस", Continue: "आगे बढ़ें", "Publish challenge": "चुनौती प्रकाशित करें",
    "Structure with AI": "AI से संरचित करें", "Structure again": "AI से फिर संरचित करें",
    "Government document (PDF, optional)": "सरकारी दस्तावेज़ (PDF, वैकल्पिक)",
    Department: "विभाग", "Challenge title": "चुनौती शीर्षक", "Sector / theme": "क्षेत्र / विषय",
    "Department objective": "विभागीय उद्देश्य", "Target beneficiaries": "लक्षित लाभार्थी",
    "Raw problem statement": "मूल समस्या विवरण", "Technical requirement": "तकनीकी आवश्यकता",
    "Measurable expected outcome": "मापने योग्य अपेक्षित परिणाम", "Known constraints": "ज्ञात सीमाएं",
    "Pilot location": "पायलट स्थान", "Minimum budget (INR)": "न्यूनतम बजट (INR)",
    "Maximum budget (INR)": "अधिकतम बजट (INR)", "Pilot duration (months)": "पायलट अवधि (महीने)",
    "Startup submission deadline": "स्टार्टअप आवेदन की अंतिम तिथि", "Expected pilot start": "अपेक्षित पायलट आरंभ",
    "Primary KPI": "प्रमुख KPI", Baseline: "आधार रेखा", Target: "लक्ष्य", Unit: "इकाई",
    "Measurement method": "मापन विधि", "Evidence source": "साक्ष्य स्रोत", "Target date": "लक्ष्य तिथि",
    "Final department review before publishing": "प्रकाशन से पहले अंतिम विभागीय समीक्षा",
  },
  mr: {
    Dashboard: "डॅशबोर्ड", Challenges: "आव्हाने", "Startup Marketplace": "स्टार्टअप बाजारपेठ",
    Evaluations: "मूल्यमापन", Pilots: "पायलट", Contracts: "करार", Payments: "देयके",
    Validation: "पडताळणी", "Scale-Up": "विस्तार", Templates: "नमुने",
    "Search challenges, startups, departments…": "आव्हाने, स्टार्टअप, विभाग शोधा…",
    "Sign in": "साइन इन", Register: "नोंदणी", "Sign out": "साइन आउट",
    "Challenge Identification": "आव्हान ओळख", "Turn a complaint into a buildable challenge": "तक्रारीचे कार्यान्वित आव्हानात रूपांतर करा",
    "Plain-language problem": "सोप्या भाषेतील समस्या", "Structured specification": "संरचित तपशील",
    "Pilot and budget": "पायलट आणि अर्थसंकल्प", "Measurement plan": "मापन योजना", Publish: "प्रकाशित करा",
    Back: "मागे", Continue: "पुढे", "Publish challenge": "आव्हान प्रकाशित करा",
    "Structure with AI": "AI सह संरचित करा", "Structure again": "AI सह पुन्हा संरचित करा",
    "Government document (PDF, optional)": "सरकारी दस्तऐवज (PDF, ऐच्छिक)",
    Department: "विभाग", "Challenge title": "आव्हानाचे शीर्षक", "Sector / theme": "क्षेत्र / विषय",
    "Department objective": "विभागीय उद्दिष्ट", "Target beneficiaries": "लक्षित लाभार्थी",
    "Raw problem statement": "मूळ समस्या निवेदन", "Technical requirement": "तांत्रिक आवश्यकता",
    "Measurable expected outcome": "मोजता येणारा अपेक्षित परिणाम", "Known constraints": "ज्ञात मर्यादा",
    "Pilot location": "पायलटचे ठिकाण", "Minimum budget (INR)": "किमान अर्थसंकल्प (INR)",
    "Maximum budget (INR)": "कमाल अर्थसंकल्प (INR)", "Pilot duration (months)": "पायलट कालावधी (महिने)",
    "Startup submission deadline": "स्टार्टअप अर्जाची अंतिम तारीख", "Expected pilot start": "अपेक्षित पायलट प्रारंभ",
    "Primary KPI": "मुख्य KPI", Baseline: "आधाररेषा", Target: "लक्ष्य", Unit: "एकक",
    "Measurement method": "मापन पद्धत", "Evidence source": "पुराव्याचा स्रोत", "Target date": "लक्ष्य तारीख",
    "Final department review before publishing": "प्रकाशनापूर्वी अंतिम विभागीय पुनरावलोकन",
  },
};

export function t(language, value) {
  return messages[language]?.[value] || value;
}
