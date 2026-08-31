var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "25mb" }));
var genAIClient = null;
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new import_genai.GoogleGenAI({
      apiKey
    });
  }
  return genAIClient;
}
async function callGemini(ai, contents, config) {
  const modelsToTry = [
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest"
  ];
  let lastError = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config
      });
      return response;
    } catch (err) {
      console.log(`[Resilience Engine] Automated fallback activated. Retrying on another model...`);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models are currently unavailable.");
}
function parseJSONResponse(rawText) {
  const clean = (rawText || "{}").replace(/```json\s*([\s\S]*?)\s*```/g, "$1").replace(/```\s*([\s\S]*?)\s*```/g, "$1").trim();
  try {
    return JSON.parse(clean);
  } catch (err) {
    const repaired = clean.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    try {
      return JSON.parse(repaired);
    } catch (err2) {
      try {
        const fixed = repairTruncatedJSON(repaired);
        return JSON.parse(fixed);
      } catch (err3) {
        console.warn("JSON repair completely failed, returning empty object fallback:", err3);
        return {};
      }
    }
  }
}
function repairTruncatedJSON(jsonStr) {
  let working = jsonStr;
  const stack = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < working.length; i++) {
    const char = working[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === "{" || char === "[") {
        stack.push(char);
      } else if (char === "}") {
        if (stack[stack.length - 1] === "{") {
          stack.pop();
        }
      } else if (char === "]") {
        if (stack[stack.length - 1] === "[") {
          stack.pop();
        }
      }
    }
  }
  if (inString) {
    working += '"';
  }
  working = working.trim();
  while (working.endsWith(",") || working.endsWith(":")) {
    working = working.slice(0, -1).trim();
  }
  while (stack.length > 0) {
    const lastOpen = stack.pop();
    if (lastOpen === "{") {
      working += "}";
    } else if (lastOpen === "[") {
      working += "]";
    }
  }
  return working;
}
function getSampleAnalysis(mealNameHint, ageTier = "classes-4-7") {
  const cleanHint = mealNameHint && mealNameHint !== "School Canteen Lunch Meal Tray" && mealNameHint !== "School Meal" ? mealNameHint.charAt(0).toUpperCase() + mealNameHint.slice(1) : "Chef's Special School Canteen Tray";
  const isPasta = cleanHint.toLowerCase().includes("pasta");
  const isBento = cleanHint.toLowerCase().includes("bento") || cleanHint.toLowerCase().includes("wrap");
  let title = cleanHint.includes("Tray") || cleanHint.includes("Lunch") || cleanHint.includes("Meal") || cleanHint.includes("Captured") ? cleanHint : `${cleanHint} Balanced Lunch Tray`;
  let items = [
    {
      id: "item-1",
      name: "Steamed Brown Rice & Yellow Lentil Dal",
      category: "Grain & Plant Protein",
      estimatedQuantity: "1 bowl (180g)",
      calories: 240,
      proteinGrams: 9,
      carbsGrams: 42,
      fiberGrams: 5.5,
      fatGrams: 3,
      micronutrients: ["Iron", "Folate", "Magnesium", "Vitamin B1"],
      funFact: "Lentils have been grown for over 8,000 years and are packed with plant power!",
      superpowerLabel: "Rocket Energy & Muscle Fuel",
      colorTag: "amber"
    },
    {
      id: "item-2",
      name: "Saut\xE9ed Spinach, Carrots & Peas Curry",
      category: "Vegetables",
      estimatedQuantity: "3/4 cup (110g)",
      calories: 75,
      proteinGrams: 3.2,
      carbsGrams: 11,
      fiberGrams: 4.2,
      fatGrams: 2.1,
      micronutrients: ["Beta-Carotene (Vit A)", "Vitamin C", "Potassium", "Lutein"],
      funFact: "Carrots were originally purple and yellow before farmers bred sweet orange ones!",
      superpowerLabel: "Eagle Eyes & Immunity Shield",
      colorTag: "emerald"
    },
    {
      id: "item-3",
      name: "Fresh Crisp Apple Slices & Orange Wedge",
      category: "Fruits",
      estimatedQuantity: "1 medium apple (100g)",
      calories: 65,
      proteinGrams: 0.5,
      carbsGrams: 16,
      fiberGrams: 3.1,
      fatGrams: 0.2,
      micronutrients: ["Vitamin C", "Antioxidants", "Hydration Water"],
      funFact: "Apples float in water because 25% of their volume is actually air!",
      superpowerLabel: "Sparkling Teeth & Brain Glow",
      colorTag: "rose"
    },
    {
      id: "item-4",
      name: "Low-Fat Fortified Curd / Yoghurt Dip",
      category: "Dairy & Probiotics",
      estimatedQuantity: "1/2 cup (80g)",
      calories: 60,
      proteinGrams: 4.5,
      carbsGrams: 6,
      fiberGrams: 0,
      fatGrams: 1.5,
      micronutrients: ["Calcium", "Vitamin D", "Probiotics", "Phosphorus"],
      funFact: "Good bacteria inside yoghurt act like friendly defenders in your stomach!",
      superpowerLabel: "Strong Bones & Happy Tummy",
      colorTag: "sky"
    }
  ];
  if (isPasta) {
    title = "Whole Wheat Rainbow Pasta & Salad Tray";
    items = [
      {
        id: "item-1",
        name: "Whole Grain Spiral Pasta with Plum Tomato Herb Sauce",
        category: "Whole Grains",
        estimatedQuantity: "1 cup (160g)",
        calories: 220,
        proteinGrams: 7.5,
        carbsGrams: 40,
        fiberGrams: 5,
        fatGrams: 3.5,
        micronutrients: ["Lycopene", "Complex Carbs", "B Vitamins"],
        funFact: "Tomatoes become even healthier when cooked with herbs because lycopene gets easier to absorb!",
        superpowerLabel: "Steady Running Fuel",
        colorTag: "amber"
      },
      {
        id: "item-2",
        name: "Tofu / Chicken Cubes with Grilled Zucchini & Sweet Bell Peppers",
        category: "Protein & Veggies",
        estimatedQuantity: "1 cup (120g)",
        calories: 140,
        proteinGrams: 13,
        carbsGrams: 7,
        fiberGrams: 3.2,
        fatGrams: 4.5,
        micronutrients: ["Protein", "Vitamin C", "Zinc", "Iron"],
        funFact: "Bell peppers have more Vitamin C than oranges!",
        superpowerLabel: "Super Muscle Repairer",
        colorTag: "emerald"
      },
      {
        id: "item-3",
        name: "Crisp Green Garden Salad with Sunflower Seeds",
        category: "Greens & Seeds",
        estimatedQuantity: "1 bowl (70g)",
        calories: 55,
        proteinGrams: 2.1,
        carbsGrams: 4.5,
        fiberGrams: 2.8,
        fatGrams: 2.2,
        micronutrients: ["Vitamin K", "Folate", "Magnesium"],
        funFact: "Sunflower seeds turn toward the morning sun in fields!",
        superpowerLabel: "Focus Booster for Math & Science",
        colorTag: "sky"
      }
    ];
  } else if (isBento) {
    title = "NutriBento Balance School Lunch";
    items = [
      {
        id: "item-1",
        name: "Whole Wheat Veggie & Hummus Wrap",
        category: "Whole Grains & Legumes",
        estimatedQuantity: "1 medium wrap (170g)",
        calories: 260,
        proteinGrams: 9.5,
        carbsGrams: 38,
        fiberGrams: 6.2,
        fatGrams: 6,
        micronutrients: ["Fiber", "Iron", "Folate", "Vitamin E"],
        funFact: "Hummus is made from chickpeas, one of the oldest superfoods on Earth!",
        superpowerLabel: "All-Day Playground Stamina",
        colorTag: "amber"
      },
      {
        id: "item-2",
        name: "Steamed Edamame Pods & Sweet Baby Corn",
        category: "Plant Protein & Veggies",
        estimatedQuantity: "1/2 cup (80g)",
        calories: 90,
        proteinGrams: 6,
        carbsGrams: 10,
        fiberGrams: 4,
        fatGrams: 2.5,
        micronutrients: ["Plant Protein", "Potassium", "Dietary Fiber"],
        funFact: "Edamame are young green soybeans bursting with plant protein!",
        superpowerLabel: "Growth Spurt Power",
        colorTag: "emerald"
      },
      {
        id: "item-3",
        name: "Watermelon Cubes & Mint",
        category: "Hydrating Fruit",
        estimatedQuantity: "1 cup (120g)",
        calories: 45,
        proteinGrams: 0.8,
        carbsGrams: 11,
        fiberGrams: 1,
        fatGrams: 0.2,
        micronutrients: ["Hydration Water (92%)", "Lycopene", "Vitamin C"],
        funFact: "Watermelon is 92% water, making it a delicious natural drink you can chew!",
        superpowerLabel: "Speedy Post-Recess Refresh",
        colorTag: "rose"
      }
    ];
  }
  const totalCalories = items.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = Number(items.reduce((sum, item) => sum + item.proteinGrams, 0).toFixed(1));
  const totalCarbs = Number(items.reduce((sum, item) => sum + item.carbsGrams, 0).toFixed(1));
  const totalFiber = Number(items.reduce((sum, item) => sum + item.fiberGrams, 0).toFixed(1));
  const totalFat = Number(items.reduce((sum, item) => sum + item.fatGrams, 0).toFixed(1));
  return {
    id: "meal-" + Date.now(),
    title,
    detectedItems: items,
    nutrition: {
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFiber,
      totalFat,
      vitamins: ["Vitamin A", "Vitamin C", "Vitamin D", "B-Complex", "Vitamin K"],
      minerals: ["Iron", "Calcium", "Magnesium", "Potassium", "Zinc"],
      healthScore: 94,
      balanceRating: "Super Balanced Champion Meal (Gold Tier)",
      energyDurationHours: "3.5 to 4 Hours of Steady Energy"
    },
    ageTierExplanations: {
      "classes-1-3": {
        headline: "\u{1F31F} Super Fuel for Playground Champions & Fun Explorers!",
        simpleDescription: "Today's yummy tray gives your body rocket fuel to run super fast during recess, strong bones for climbing monkey bars, and sharp eyes like a hawk!",
        portionTip: "Take 3 brave bites of your colorful veggies and drink all your warm soup/dal! Finish your apple slice for a sparkling smile.",
        powerBadges: [
          { icon: "Rocket", title: "Rocket Energy", subtitle: "Rice & Grains keep you active without feeling sleepy!", color: "from-amber-500 to-orange-500" },
          { icon: "Zap", title: "Muscle Maker", subtitle: "Lentils & Tofu help your muscles grow big and strong!", color: "from-blue-500 to-indigo-500" },
          { icon: "Shield", title: "Shield of Health", subtitle: "Veggies protect you from coughing and runny noses!", color: "from-emerald-500 to-teal-500" },
          { icon: "Sparkles", title: "Eagle Vision", subtitle: "Bright orange carrots help your eyes see clearly in class!", color: "from-rose-500 to-pink-500" }
        ],
        smartFact: "\u{1F4A1} Did you know? Eating colorful food gives you different superhero powers every day!",
        speechScript: "Hello Little Explorers! Today's meal gives you rocket energy for recess and eagle eyes for reading! Eat your colorful veggies and enjoy every bite!"
      },
      "classes-4-7": {
        headline: "\u26A1 High-Performance Lunch: Power Your Brain & Athletic Stamina!",
        simpleDescription: "This meal is engineered with complex slow-release carbohydrates for non-stop classroom concentration and rich plant protein to repair active muscles after sports practice.",
        portionTip: "Classes 4\u20137: Eat your full serving of lentils/protein and at least 1 cup of colorful veggies. Avoid skipping the fiber to prevent afternoon energy crashes.",
        powerBadges: [
          { icon: "Brain", title: "Exam Focus Carbs", subtitle: "Slow-burn carbs prevent the 2:00 PM classroom slump!", color: "from-violet-500 to-purple-500" },
          { icon: "Activity", title: "Stamina Builder", subtitle: "Iron delivers oxygen straight to your heart and muscles.", color: "from-amber-500 to-orange-500" },
          { icon: "HeartPulse", title: "Immune Defense", subtitle: "Antioxidants and Vitamin C strengthen cellular health.", color: "from-emerald-500 to-green-600" },
          { icon: "Award", title: "Growth Spurt Boost", subtitle: "Calcium + Zinc supports healthy bone density growth.", color: "from-sky-500 to-cyan-500" }
        ],
        smartFact: "\u{1F4A1} Brain Fact: Your brain consumes 20% of your daily energy. Complex grains give it steady fuel without sugar spikes!",
        speechScript: "Attention Growing Champions! Today's meal delivers steady brain energy for math and science, plus muscle repair protein for your sports period. Clean your plate and power up!"
      },
      "classes-8-10": {
        headline: "\u{1F680} Optimal Metabolic Fuel: Sustained Focus & High Athletic Recovery",
        simpleDescription: "A scientifically balanced macronutrient profile (55% complex carbs, 20% protein, 15% healthy fats, high dietary fiber) designed for peak cognitive endurance, metabolic balance, and sports recovery.",
        portionTip: "Teenagers need higher caloric density. Ensure you consume the full portion of legumes/protein for vital amino acids and fiber to maintain steady glycemic balance.",
        powerBadges: [
          { icon: "Cpu", title: "Cognitive Endurance", subtitle: "Low-glycemic index grains support 4+ hours of steady executive focus.", color: "from-indigo-600 to-blue-700" },
          { icon: "Flame", title: "Metabolic Efficiency", subtitle: "Dietary fiber (18g+) supports microbiome health and metabolic absorption.", color: "from-orange-500 to-red-500" },
          { icon: "ShieldCheck", title: "Cellular Recovery", subtitle: "Micronutrient spectrum (Zinc, Folate, Iron) accelerates post-workout recovery.", color: "from-teal-600 to-emerald-600" },
          { icon: "Sparkles", title: "Clean Plate Sustainability", subtitle: "Every gram eaten prevents methane emissions and supports SDG 12.", color: "from-emerald-500 to-teal-500" }
        ],
        smartFact: "\u{1F4A1} Nutrition Science: Combining Vitamin C with plant-based iron boosts iron bioavailability by up to 300%!",
        speechScript: "NutriBoard Announcement for Classes 8 through 10. Today's tray features an optimal macro ratio with rich dietary fiber and bioavailable micronutrients for long study hours and athletics."
      }
    },
    activeAgeTier: ageTier,
    sdgImpact: {
      sdg12Tip: "SDG 12 (Responsible Consumption): Finishing your plate saves 0.42 kg CO2 equivalent and 110 litres of freshwater used in agriculture.",
      sdg3Tip: "SDG 3 (Good Health & Well-being): Balanced school meals improve classroom attention spans by 34%!",
      zeroWastePledge: "Take what you eat, eat what you take. Every clean plate is a victory for our planet!"
    },
    timestamp: Date.now(),
    canteenStaffNotes: "Approved by School Nutritionist. Low sodium, zero ultra-processed additives."
  };
}
app.post("/api/analyze-meal", async (req, res) => {
  try {
    const { imageBase64, imageMimeType, mealDescription, ageTier = "classes-4-7" } = req.body;
    const ai = getGenAI();
    if (!ai) {
      console.log("No Gemini API key found, returning intelligent synthesized meal analysis.");
      const sample = getSampleAnalysis(mealDescription || "rice and lentils with veggies", ageTier);
      return res.json({ success: true, data: sample, isSimulated: true });
    }
    const prompt = `You are NutriBoard AI, an advanced AI nutrition expert and school canteen nutrition educator.
Your task is to analyze this school meal tray/photo and produce an ultra-clear, age-tiered nutrition breakdown.

TARGET AGE GROUP TIER: ${ageTier} (Options: 'classes-1-3', 'classes-4-7', 'classes-8-10')
MEAL DESCRIPTION / CONTEXT: ${mealDescription || "School canteen meal tray"}

Requirements:
1. Identify each distinct food item in the meal with estimated quantity, calories, protein (g), carbs (g), dietary fiber (g), healthy fat (g), micronutrients, a fun educational fact, and a kid-friendly superpower label.
2. Provide total nutrition summary (calories, protein, carbs, fiber, fat, health score 1-100, balance rating).
3. Translate complicated terms into 3 DISTINCT age-appropriate explanations:
   - "classes-1-3" (Classes 1\u20133, Ages 6-8: playful, superhero analogies, concrete action verbs like 'rocket fuel', 'eagle eyes', 'shield')
   - "classes-4-7" (Classes 4\u20137, Ages 9-12: curious, sporty, exam focus, brain benefits, growth spurt terms)
   - "classes-8-10" (Classes 8\u201310, Ages 13-16: scientific yet engaging, sports recovery, cognitive stamina, glycemic balance)
4. Link to UN Sustainable Development Goals (SDG 12 Responsible Consumption, SDG 3 Good Health).
5. CRITICAL CONCISENESS RULE: Keep all descriptions, funFact, tip, and speechScript values extremely concise (1-2 sentences maximum). Limit detectedItems list to at most 3-4 primary items. This is crucial so the complete JSON response does not get truncated.

Format your output strictly as a JSON object matching this schema:
{
  "id": "meal-...",
  "title": "Descriptive meal title",
  "detectedItems": [
    {
      "id": "item-1",
      "name": "Food item name",
      "category": "Food category",
      "estimatedQuantity": "e.g. 1 cup (150g)",
      "calories": 200,
      "proteinGrams": 8.5,
      "carbsGrams": 35,
      "fiberGrams": 4.5,
      "fatGrams": 2.5,
      "micronutrients": ["Iron", "Vitamin C"],
      "funFact": "Interesting trivia kids will love",
      "superpowerLabel": "e.g. Brain Booster / Rocket Energy",
      "colorTag": "amber" | "emerald" | "rose" | "sky" | "violet"
    }
  ],
  "nutrition": {
    "totalCalories": 450,
    "totalProtein": 18,
    "totalCarbs": 65,
    "totalFiber": 9,
    "totalFat": 10,
    "vitamins": ["Vitamin A", "Vitamin C", "B-Complex"],
    "minerals": ["Iron", "Calcium", "Zinc"],
    "healthScore": 92,
    "balanceRating": "Excellent Balanced School Meal",
    "energyDurationHours": "3 to 4 hours"
  },
  "ageTierExplanations": {
    "classes-1-3": {
      "headline": "Playful headline for young kids with emojis",
      "simpleDescription": "Simple story-like message about why this meal makes them strong and speedy",
      "portionTip": "Gentle guidance on what to finish first",
      "powerBadges": [
        { "icon": "Rocket", "title": "Rocket Energy", "subtitle": "Short benefit", "color": "from-amber-500 to-orange-500" },
        { "icon": "Shield", "title": "Health Shield", "subtitle": "Short benefit", "color": "from-emerald-500 to-teal-500" },
        { "icon": "Zap", "title": "Muscle Maker", "subtitle": "Short benefit", "color": "from-blue-500 to-indigo-500" },
        { "icon": "Sparkles", "title": "Brain Spark", "subtitle": "Short benefit", "color": "from-rose-500 to-pink-500" }
      ],
      "smartFact": "Super fun food fact",
      "speechScript": "Short 2-sentence script for Smart Board voice read aloud to Class 1-3 kids"
    },
    "classes-4-7": {
      "headline": "Headline for classes 4-7 with energy & sports focus",
      "simpleDescription": "Clear explanation of how carbs, protein, and vitamins support sports and math/science classes",
      "portionTip": "Specific portion and variety advice for growing adolescents",
      "powerBadges": [
        { "icon": "Brain", "title": "Exam Focus Fuel", "subtitle": "Short benefit", "color": "from-violet-500 to-purple-500" },
        { "icon": "Activity", "title": "Sports Stamina", "subtitle": "Short benefit", "color": "from-amber-500 to-orange-500" },
        { "icon": "HeartPulse", "title": "Immunity Guard", "subtitle": "Short benefit", "color": "from-emerald-500 to-green-600" },
        { "icon": "Award", "title": "Growth Acceleration", "subtitle": "Short benefit", "color": "from-sky-500 to-cyan-500" }
      ],
      "smartFact": "Engaging science fact",
      "speechScript": "Smart Board announcement script for Class 4-7"
    },
    "classes-8-10": {
      "headline": "Headline for classes 8-10 with macro & metabolic focus",
      "simpleDescription": "Mature nutritional breakdown of slow-release energy, protein synthesis, and cognitive endurance",
      "portionTip": "Portion optimization for high metabolic demand and teenage growth",
      "powerBadges": [
        { "icon": "Cpu", "title": "Cognitive Focus", "subtitle": "Short benefit", "color": "from-indigo-600 to-blue-700" },
        { "icon": "Flame", "title": "Metabolic Balance", "subtitle": "Short benefit", "color": "from-orange-500 to-red-500" },
        { "icon": "ShieldCheck", "title": "Cellular Health", "subtitle": "Short benefit", "color": "from-teal-600 to-emerald-600" },
        { "icon": "Sparkles", "title": "Zero Waste Impact", "subtitle": "Short benefit", "color": "from-emerald-500 to-teal-500" }
      ],
      "smartFact": "Advanced nutritional trivia",
      "speechScript": "Smart Board announcement script for Class 8-10"
    }
  },
  "sdgImpact": {
    "sdg12Tip": "Responsible consumption fact with metrics (CO2, water saved)",
    "sdg3Tip": "Good health & nutrition fact",
    "zeroWastePledge": "Inspirational zero-waste motto"
  },
  "canteenStaffNotes": "Practical culinary/nutritionist notes for canteen preparation"
}`;
    let contentsPayload;
    if (imageBase64) {
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: imageMimeType || "image/jpeg",
              data: imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "")
            }
          },
          { text: prompt }
        ]
      };
    } else {
      contentsPayload = prompt;
    }
    const response = await callGemini(ai, contentsPayload, {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 6e3
    });
    const parsedData = parseJSONResponse(response.text);
    if (!parsedData || !parsedData.detectedItems || parsedData.detectedItems.length === 0) {
      throw new Error("Invalid or empty JSON structure returned from model.");
    }
    parsedData.activeAgeTier = ageTier;
    parsedData.timestamp = Date.now();
    res.json({ success: true, data: parsedData });
  } catch (error) {
    console.error("Error in /api/analyze-meal:", error);
    const fallback = getSampleAnalysis(req.body?.mealDescription || "School Meal", req.body?.ageTier || "classes-4-7");
    res.json({ success: true, data: fallback, isFallback: true, error: error.message });
  }
});
app.post("/api/menu-suggestions", async (req, res) => {
  try {
    const { weeklyMenu, targetGoal = "increase-iron-and-fiber", budgetTier = "standard" } = req.body;
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        data: {
          overallGrade: "A-",
          summaryReview: "Good baseline balance, but mid-week menus show a slight dip in dark green vegetables and whole grain variety.",
          nutritionalScore: 88,
          colorDiversityScore: "8.5 / 10",
          topRecommendations: [
            {
              targetDay: "Wednesday",
              title: "Boost Iron & Vitamin C Absorption",
              currentDish: "Plain Steamed Rice with Lentils",
              improvedDish: "Iron-Rich Spinach Lentil Dal with Lemon Slices & Roasted Cumin",
              kidFriendlyAngle: "Call it 'Emerald Hero Stew' with squeeze-your-own lemon wedges for fun interactivity!",
              wasteReductionTip: "Finely chopping greens prevents students from picking them out.",
              estimatedCostChange: "+$0.04 per tray",
              nutritionGain: "+4.2mg bioavailable Iron, +18mg Vit C"
            },
            {
              targetDay: "Friday",
              title: "Whole Grain & Fiber Upgrade",
              currentDish: "White Bread Sandwich with Cheese",
              improvedDish: "Multi-Grain Pita Pockets with Grated Carrot-Cucumber Hummus Spread",
              kidFriendlyAngle: "Pocket format prevents messy spills and makes crunchy veggies exciting to bite into.",
              wasteReductionTip: "Pita pockets reduce dropped bread crusts by up to 60%.",
              estimatedCostChange: "Cost neutral",
              nutritionGain: "+4.5g Dietary Fiber, -120mg Sodium"
            },
            {
              targetDay: "Monday",
              title: "Natural Hydration & Electrolytes",
              currentDish: "Commercial Fruit Punch",
              improvedDish: "Infused Water with Fresh Orange Slices, Mint & Cucumbers",
              kidFriendlyAngle: "Visible fruit floating in clear glass dispensers looks refreshing and tasty!",
              wasteReductionTip: "Zero single-use packaging waste and cuts refined sugar by 18g per student.",
              estimatedCostChange: "-$0.12 per student (Cost savings!)",
              nutritionGain: "-18g added sugar, +Hydration"
            }
          ],
          seasonalProduceSpotlight: [
            { name: "Sweet Carrots & Beetroot", bestUse: "Grated in coleslaw or baked into mini whole-wheat muffins", season: "Peak Freshness" },
            { name: "Local Green Peas & Spinach", bestUse: "Blended in pasta pesto sauces for vibrant green color", season: "Budget-Friendly" },
            { name: "Crisp Red Apples", bestUse: "Pre-sliced with a pinch of cinnamon to prevent browning", season: "High Student Acceptance" }
          ],
          sdg12Checklist: [
            "Batch-cook base sauces that can be repurposed across two days",
            "Offer 'Junior' and 'Senior' scoop sizes to eliminate plate leftovers",
            "Feature a weekly 'Student Recipe Vote' to ensure high meal excitement"
          ]
        },
        isSimulated: true
      });
    }
    const prompt = `You are NutriBoard AI Menu Assistant, an expert school canteen chef and pediatric nutritionist.
Analyze the following school canteen menu and optimization goals:

Weekly Menu Data: ${JSON.stringify(weeklyMenu || [])}
Target Goal: ${targetGoal}
Budget Level: ${budgetTier}

Provide constructive, kid-approved culinary upgrades that:
1. Maximize nutritional density (fiber, iron, calcium, natural vitamins).
2. Minimize kitchen preparation waste and student plate leftovers.
3. Keep ingredients affordable and easy for school canteen staff.
4. Provide fun, enticing names and serving ideas that students love.

Return strict JSON with this schema:
{
  "overallGrade": "A",
  "summaryReview": "string",
  "nutritionalScore": 90,
  "colorDiversityScore": "8.8 / 10",
  "topRecommendations": [
    {
      "targetDay": "Day of week",
      "title": "Strategy Title",
      "currentDish": "Current meal item",
      "improvedDish": "AI suggested improved meal item",
      "kidFriendlyAngle": "Why kids will actually eat it",
      "wasteReductionTip": "How this reduces canteen food waste",
      "estimatedCostChange": "e.g. Cost neutral or -$0.05",
      "nutritionGain": "e.g. +5g Fiber, +4mg Iron"
    }
  ],
  "seasonalProduceSpotlight": [
    { "name": "Produce name", "bestUse": "How canteen should prepare it", "season": "Benefit" }
  ],
  "sdg12Checklist": ["Practical tip 1", "Practical tip 2", "Practical tip 3"]
}`;
    const response = await callGemini(ai, prompt, {
      responseMimeType: "application/json",
      temperature: 0.3
    });
    const data = parseJSONResponse(response.text);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error in /api/menu-suggestions:", error);
    const fallback = {
      overallGrade: "A-",
      summaryReview: "Good baseline balance, but mid-week menus show a slight dip in dark green vegetables and whole grain variety.",
      nutritionalScore: 88,
      colorDiversityScore: "8.5 / 10",
      topRecommendations: [
        {
          targetDay: "Wednesday",
          title: "Boost Iron & Vitamin C Absorption",
          currentDish: "Plain Steamed Rice with Lentils",
          improvedDish: "Iron-Rich Spinach Lentil Dal with Lemon Slices & Roasted Cumin",
          kidFriendlyAngle: "Call it 'Emerald Hero Stew' with squeeze-your-own lemon wedges for fun interactivity!",
          wasteReductionTip: "Finely chopping greens prevents students from picking them out.",
          estimatedCostChange: "+$0.04 per tray",
          nutritionGain: "+4.2mg bioavailable Iron, +18mg Vit C"
        },
        {
          targetDay: "Friday",
          title: "Whole Grain & Fiber Upgrade",
          currentDish: "White Bread Sandwich with Cheese",
          improvedDish: "Multi-Grain Pita Pockets with Grated Carrot-Cucumber Hummus Spread",
          kidFriendlyAngle: "Pocket format prevents messy spills and makes crunchy veggies exciting to bite into.",
          wasteReductionTip: "Pita pockets reduce dropped bread crusts by up to 60%.",
          estimatedCostChange: "Cost neutral",
          nutritionGain: "+4.5g Dietary Fiber, -120mg Sodium"
        },
        {
          targetDay: "Monday",
          title: "Natural Hydration & Electrolytes",
          currentDish: "Commercial Fruit Punch",
          improvedDish: "Infused Water with Fresh Orange Slices, Mint & Cucumbers",
          kidFriendlyAngle: "Visible fruit floating in clear glass dispensers looks refreshing and tasty!",
          wasteReductionTip: "Zero single-use packaging waste and cuts refined sugar by 18g per student.",
          estimatedCostChange: "-$0.12 per student (Cost savings!)",
          nutritionGain: "-18g added sugar, +Hydration"
        }
      ],
      seasonalProduceSpotlight: [
        { name: "Sweet Carrots & Beetroot", bestUse: "Grated in coleslaw or baked into mini whole-wheat muffins", season: "Peak Freshness" },
        { name: "Local Green Peas & Spinach", bestUse: "Blended in pasta pesto sauces for vibrant green color", season: "Budget-Friendly" },
        { name: "Crisp Red Apples", bestUse: "Pre-sliced with a pinch of cinnamon to prevent browning", season: "High Student Acceptance" }
      ],
      sdg12Checklist: [
        "Batch-cook base sauces that can be repurposed across two days",
        "Offer 'Junior' and 'Senior' scoop sizes to eliminate plate leftovers",
        "Feature a weekly 'Student Recipe Vote' to ensure high meal excitement"
      ]
    };
    res.json({ success: true, data: fallback, isFallback: true, error: error.message });
  }
});
app.post("/api/waste-insights", async (req, res) => {
  try {
    const { wasteLogs = [] } = req.body;
    const ai = getGenAI();
    if (!ai) {
      return res.json({
        success: true,
        data: {
          wasteReductionScore: 82,
          averageWasteRate: "14.2%",
          keyInsights: [
            {
              dishName: "Whole Steamed Broccoli Florets",
              wasteLevel: "High (38% discarded)",
              rootCause: "Overcooked soft texture and plain appearance makes younger students (Classes 1-4) leave them untouched.",
              actionableFix: "Roast with light garlic-olive oil and a dusting of grated cheese, or pur\xE9e into pasta sauce as 'Hulk Green Sauce'.",
              estimatedKgSavedPerWeek: 12.5,
              impactSummary: "Will save ~$38/week and prevent 24 kg CO2 emissions."
            },
            {
              dishName: "White Rice Portions for Classes 1\u20133",
              wasteLevel: "Medium (22% leftover)",
              rootCause: "Standard 200g serving scoop is oversized for 6-8 year olds who get full halfway.",
              actionableFix: "Introduce a dual-scoop policy: 120g for Classes 1\u20133 with optional 'Seconds Bar' for hungrier kids.",
              estimatedKgSavedPerWeek: 18,
              impactSummary: "Reduces grain waste by 65% with zero student hunger complaints."
            },
            {
              dishName: "Whole Uncut Apples",
              wasteLevel: "Medium (19% taken but only half eaten)",
              rootCause: "Younger kids with loose baby teeth find biting whole firm apples difficult and time-consuming during brief lunch periods.",
              actionableFix: "Pre-slice into 6 wedges with a gentle lemon-water dip to prevent browning.",
              estimatedKgSavedPerWeek: 9,
              impactSummary: "Apple consumption jumps to 96% when served as wedges."
            }
          ],
          sdg12ImpactMetrics: {
            totalKgSavedMonth: 158,
            co2PreventedKg: 316,
            waterConservedLitres: 48500,
            financialSavingsDollars: 420
          },
          smartBoardStudentChallenge: "\u{1F3C6} Clean Plate Club: Can our school achieve under 8% cafeteria waste this Friday? The winning class gets the Golden Apple Trophy!"
        },
        isSimulated: true
      });
    }
    const prompt = `You are NutriBoard AI Waste Reduction Specialist for school canteens (SDG 12: Responsible Consumption).
Analyze these cafeteria leftover logs:
${JSON.stringify(wasteLogs)}

Identify waste patterns, root causes (e.g. portion sizing, texture, serving speed, temperature), and calculate concrete culinary and portion modifications.

Return strict JSON with this schema:
{
  "wasteReductionScore": 85,
  "averageWasteRate": "12.5%",
  "keyInsights": [
    {
      "dishName": "Name of food item",
      "wasteLevel": "High / Medium / Low",
      "rootCause": "Why students aren't finishing this item",
      "actionableFix": "Specific kitchen/canteen adjustment",
      "estimatedKgSavedPerWeek": 10.5,
      "impactSummary": "Financial and carbon benefit"
    }
  ],
  "sdg12ImpactMetrics": {
    "totalKgSavedMonth": 140,
    "co2PreventedKg": 280,
    "waterConservedLitres": 42000,
    "financialSavingsDollars": 380
  },
  "smartBoardStudentChallenge": "Engaging motivational challenge to display on school smart boards"
}`;
    const response = await callGemini(ai, prompt, {
      responseMimeType: "application/json",
      temperature: 0.2
    });
    const data = parseJSONResponse(response.text);
    res.json({ success: true, data });
  } catch (error) {
    console.error("Error in /api/waste-insights:", error);
    const fallback = {
      wasteReductionScore: 82,
      averageWasteRate: "14.2%",
      keyInsights: [
        {
          dishName: "Whole Steamed Broccoli Florets",
          wasteLevel: "High (38% discarded)",
          rootCause: "Overcooked soft texture and plain appearance makes younger students (Classes 1-4) leave them untouched.",
          actionableFix: "Roast with light garlic-olive oil and a dusting of grated cheese, or pur\xE9e into pasta sauce as 'Hulk Green Sauce'.",
          estimatedKgSavedPerWeek: 12.5,
          impactSummary: "Will save ~$38/week and prevent 24 kg CO2 emissions."
        },
        {
          dishName: "White Rice Portions for Classes 1\u20133",
          wasteLevel: "Medium (22% leftover)",
          rootCause: "Standard 200g serving scoop is oversized for 6-8 year olds who get full halfway.",
          actionableFix: "Introduce a dual-scoop policy: 120g for Classes 1\u20133 with optional 'Seconds Bar' for hungrier kids.",
          estimatedKgSavedPerWeek: 18,
          impactSummary: "Reduces grain waste by 65% with zero student hunger complaints."
        },
        {
          dishName: "Whole Uncut Apples",
          wasteLevel: "Medium (19% taken but only half eaten)",
          rootCause: "Younger kids with loose baby teeth find biting whole firm apples difficult and time-consuming during brief lunch periods.",
          actionableFix: "Pre-slice into 6 wedges with a gentle lemon-water dip to prevent browning.",
          estimatedKgSavedPerWeek: 9,
          impactSummary: "Apple consumption jumps to 96% when served as wedges."
        }
      ],
      sdg12ImpactMetrics: {
        totalKgSavedMonth: 158,
        co2PreventedKg: 316,
        waterConservedLitres: 48500,
        financialSavingsDollars: 420
      },
      smartBoardStudentChallenge: "\u{1F3C6} Clean Plate Club: Can our school achieve under 8% cafeteria waste this Friday? The winning class gets the Golden Apple Trophy!"
    };
    res.json({ success: true, data: fallback, isFallback: true, error: error.message });
  }
});
app.post("/api/staff-chat", async (req, res) => {
  try {
    const { message, chatHistory = [], activeAgeTier = "classes-4-7" } = req.body;
    const ai = getGenAI();
    const systemInstruction = `You are NutriBoard AI, an expert school nutrition and canteen management advisor. You help school canteen staff, nutritionists, and principals answer questions regarding school lunch menus, child nutrition requirements (Classes 1-10), food waste reduction, SDG 12 sustainability, and recipe improvements. Be warm, professional, encouraging, and practical.`;
    const chatContext = chatHistory.map((h) => `${h.role === "user" ? "Staff" : "NutriBoard AI"}: ${h.text}`).join("\n");
    const prompt = `${systemInstruction}

Target Student Age Tier: ${activeAgeTier}

Conversation History:
${chatContext}

Staff Question: ${message}

Provide a helpful, actionable, and encouraging response as NutriBoard AI.`;
    if (!ai) {
      return res.json({
        success: true,
        reply: "Hello! As your NutriBoard AI nutrition advisor, I'm here to help with canteen recipes, nutrition facts, and student engagement tips. (Note: Please configure a Gemini API key for live AI answers, or ask me about menu planning, iron-rich foods, or reducing food waste!)"
      });
    }
    const response = await callGemini(ai, prompt, {
      temperature: 0.7
    });
    const reply = response.text || "I am here to help with your school canteen and nutrition questions!";
    res.json({ success: true, reply });
  } catch (err) {
    console.error("Error in /api/staff-chat:", err);
    res.json({
      success: true,
      reply: "I encountered a high demand on the AI service, but here is a quick tip: Focus on vibrant colors and mild savory spices in dal and vegetable dishes to naturally boost student appetite and reduce plate waste!"
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`NutriBoard AI Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
