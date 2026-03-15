import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle2, XCircle, Trophy, RotateCcw, Sparkles } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const QUIZ_BANK: QuizQuestion[] = [
  {
    question: "Can pizza boxes be recycled?",
    options: ["Yes, always", "Only if clean and grease-free", "No, never", "Only the lid"],
    correct: 1,
    explanation: "Pizza boxes can be recycled only if they're free of grease and food residue. Greasy portions should go in compost or garbage.",
  },
  {
    question: "How many times can aluminium be recycled?",
    options: ["Once", "Up to 10 times", "Indefinitely", "Up to 50 times"],
    correct: 2,
    explanation: "Aluminium can be recycled infinitely without losing quality. Recycling one can saves enough energy to run a TV for 3 hours!",
  },
  {
    question: "Should you leave caps on plastic bottles when recycling?",
    options: ["Yes, always", "No, remove them", "It doesn't matter", "Only for large bottles"],
    correct: 1,
    explanation: "Remove caps before recycling. Caps are often made of different plastic and can cause issues during processing.",
  },
  {
    question: "What percentage of the world's plastic has been recycled?",
    options: ["About 50%", "About 30%", "About 9%", "About 20%"],
    correct: 2,
    explanation: "Only about 9% of all plastic ever produced has been recycled. The rest ends up in landfills, incinerators, or the environment.",
  },
  {
    question: "Which item should NOT go in the recycling bin?",
    options: ["Newspaper", "Glass jar", "Styrofoam container", "Cardboard box"],
    correct: 2,
    explanation: "Styrofoam (polystyrene) is not accepted in most curbside recycling programs due to its low density and contamination issues.",
  },
  {
    question: "How long does a glass bottle take to decompose in a landfill?",
    options: ["100 years", "500 years", "1,000 years", "Up to 1 million years"],
    correct: 3,
    explanation: "Glass can take up to 1 million years to decompose. But it can be recycled endlessly without loss of quality!",
  },
  {
    question: "What happens to recycled paper?",
    options: ["It becomes compost", "It's turned into new paper products", "It's burned for energy", "It's exported overseas"],
    correct: 1,
    explanation: "Recycled paper is pulped and turned into new paper products like newspapers, cardboard, and tissue paper.",
  },
  {
    question: "Are black plastic containers recyclable?",
    options: ["Yes, like any plastic", "Usually not", "Only in special bins", "Only if labelled"],
    correct: 1,
    explanation: "Most sorting facilities use infrared sensors that can't detect black plastic, so it often ends up in landfill.",
  },
  {
    question: "What's the most recycled material in the world?",
    options: ["Plastic", "Paper", "Steel", "Glass"],
    correct: 2,
    explanation: "Steel is the most recycled material globally. Over 80% of steel is recycled, far exceeding paper, plastic, and glass.",
  },
  {
    question: "Can you recycle shredded paper?",
    options: ["Yes, in a bag", "No, pieces are too small", "Only at special centres", "Yes, loose in the bin"],
    correct: 0,
    explanation: "Shredded paper can be recycled if placed in a clear bag or paper envelope, so the small pieces don't contaminate other recyclables.",
  },
];

const POINTS_PER_CORRECT = 5;
const QUIZ_SIZE = 5;

const QuizPage = () => {
  const { addPoints } = useUser();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);

  const questions = useMemo(() => {
    const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, QUIZ_SIZE);
  }, []);

  const current = questions[currentIndex];

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    if (idx === current.correct) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      const earnedPts = score * POINTS_PER_CORRECT;
      if (earnedPts > 0) {
        addPoints(earnedPts);
        toast.success(`Quiz complete! +${earnedPts} points earned 🧠`);
      }
      setFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center gap-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
            <Trophy className="w-12 h-12 text-primary" />
          </div>
        </motion.div>
        <div>
          <h2 className="text-display mb-2">Quiz Complete!</h2>
          <p className="text-muted-foreground">
            You got <strong className="text-foreground">{score}/{questions.length}</strong> correct ({pct}%)
          </p>
        </div>
        <div className="flex items-center gap-2 text-success">
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">+{score * POINTS_PER_CORRECT} points earned</span>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          {pct >= 80 ? "Amazing! You're a recycling expert! 🌟" : pct >= 60 ? "Good job! Keep learning! 📚" : "Keep practicing – every bit of knowledge helps! 💪"}
        </p>
        <button onClick={handleRestart} className="flex items-center gap-2 px-6 py-3 bg-foreground text-background rounded-2xl font-medium active-press">
          <RotateCcw className="w-4 h-4" />
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col">
      <div className="mb-6">
        <h1 className="text-display mb-1">Recycling Quiz</h1>
        <p className="text-sm text-muted-foreground">Test your recycling knowledge</p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            className="h-full bg-primary rounded-full"
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="font-mono text-xs text-muted-foreground">{currentIndex + 1}/{questions.length}</span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex-1 flex flex-col"
        >
          <div className="flex items-start gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold leading-snug pt-1.5">{current.question}</h2>
          </div>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {current.options.map((opt, idx) => {
              let style = "border-border bg-card hover:bg-secondary";
              if (answered) {
                if (idx === current.correct) style = "border-success/50 bg-success/10";
                else if (idx === selected) style = "border-destructive/50 bg-destructive/10";
                else style = "border-border bg-card opacity-50";
              } else if (idx === selected) {
                style = "border-primary/50 bg-primary/5";
              }

              return (
                <motion.button
                  key={idx}
                  whileTap={!answered ? { scale: 0.97 } : undefined}
                  onClick={() => handleSelect(idx)}
                  className={`w-full text-left p-4 rounded-2xl border transition-colors flex items-center gap-3 ${style}`}
                >
                  <span className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm font-medium">{opt}</span>
                  {answered && idx === current.correct && <CheckCircle2 className="w-5 h-5 text-success ml-auto shrink-0" />}
                  {answered && idx === selected && idx !== current.correct && <XCircle className="w-5 h-5 text-destructive ml-auto shrink-0" />}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-6"
              >
                <p className="text-sm text-foreground/80 leading-relaxed">{current.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next button */}
          {answered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-auto">
              <button onClick={handleNext} className="w-full py-4 bg-foreground text-background rounded-2xl font-medium active-press">
                {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default QuizPage;
