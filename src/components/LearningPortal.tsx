import React, { useState } from 'react';
import { 
  GraduationCap, 
  Satellite, 
  Layers, 
  LineChart, 
  HelpCircle, 
  ArrowRight, 
  CheckCircle, 
  AlertTriangle,
  Award,
  BookOpen
} from 'lucide-react';
import { Lesson, QuizQuestion } from '../types';
import { CURRICULUM, QUIZ } from '../data';

export default function LearningPortal() {
  const [selectedLessonId, setSelectedLessonId] = useState<number>(1);
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizStatus, setQuizStatus] = useState<'idle' | 'submitted'>('idle');
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  
  // Dynamic progress calculated by correct quiz questions + lessons read
  const totalQuizQuestions = QUIZ.length;
  const progressPercent = Math.min(
    24 + Math.round((correctAnswers / totalQuizQuestions) * 76), 
    100
  );

  const activeLesson = CURRICULUM.find(l => l.id === selectedLessonId) || CURRICULUM[0];
  const activeQuiz = QUIZ[quizIndex];

  const handleOptionClick = (idx: number) => {
    if (quizStatus === 'submitted') return;
    setSelectedOption(idx);
  };

  const submitAnswer = () => {
    if (selectedOption === null || quizStatus === 'submitted') return;
    setQuizStatus('submitted');
    if (selectedOption === activeQuiz.answerIndex) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  const nextQuiz = () => {
    setSelectedOption(null);
    setQuizStatus('idle');
    setQuizIndex((quizIndex + 1) % QUIZ.length);
  };

  const nextLesson = () => {
    const nextId = (selectedLessonId % CURRICULUM.length) + 1;
    setSelectedLessonId(nextId);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] relative overflow-hidden bg-[#F5F5F0] text-[#1A1A1A]">
      
      {/* Syllabus Sidebar List */}
      <aside className="w-full lg:w-80 h-full bg-[#EAEAE2] border-r border-black/15 flex flex-col shrink-0 select-none pb-12 lg:pb-0 z-10">
        <div className="px-5 py-6 flex-1 overflow-y-auto">
          <h3 className="font-mono text-[10px] text-[#2A4B35] mb-4 tracking-widest uppercase font-bold">CURRICULUM</h3>
          <div className="space-y-1.5">
            {CURRICULUM.map((lesson) => (
              <div 
                key={lesson.id}
                onClick={() => setSelectedLessonId(lesson.id)}
                className={`relative group cursor-pointer p-3 rounded-lg flex items-center gap-3 transition-all ${
                  selectedLessonId === lesson.id 
                    ? 'bg-[#2A4B35]/10 text-[#1A1A1A] font-bold' 
                    : 'text-black/70 hover:bg-black/5'
                }`}
              >
                {selectedLessonId === lesson.id && (
                  <div className="absolute left-0 top-0 w-1 h-full bg-[#2A4B35] rounded-r-md"></div>
                )}
                <BookOpen className={`w-4.5 h-4.5 ${selectedLessonId === lesson.id ? 'text-[#2A4B35]' : 'text-black/50'}`} />
                <span className="text-xs font-sans tracking-wide truncate">{lesson.title}</span>
              </div>
            ))}
            
            <div className="pt-4 border-t border-black/10 space-y-1">
              <span className="font-mono text-[9px] text-black/50 tracking-wider block font-bold px-3 uppercase">Bonus Topics</span>
              <div className="p-3 rounded-lg text-black/50 flex items-center gap-3 text-xs">
                <Satellite className="w-4 h-4" />
                <span>Chlorophyll Absorption</span>
              </div>
              <div className="p-3 rounded-lg text-black/40 flex items-center gap-3 text-xs">
                <Layers className="w-4 h-4" />
                <span>Atmospheric Correction</span>
              </div>
              <div className="p-3 rounded-lg text-black/35 flex items-center gap-3 text-xs">
                <LineChart className="w-4 h-4" />
                <span>Temporal Monitoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Tracker Card at footer */}
        <div className="p-5 border-t border-black/15 bg-black/5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] text-black/60 tracking-wider uppercase font-bold">Course Progress</span>
            <span className="font-mono text-xs font-bold text-[#2A4B35]">{progressPercent}%</span>
          </div>
          <div className="w-full bg-black/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-[#2A4B35] h-full transition-all duration-700" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </aside>

      {/* Main Educational Canvas */}
      <main className="flex-1 h-full overflow-y-auto pb-24">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 text-left">
          
          {/* Module Indicator Breadcrumbs */}
          <div className="flex items-center gap-2 text-black/50 font-mono text-[10px] tracking-wider font-bold">
            <span>{activeLesson.module}</span>
            <span className="text-[#2A4B35]">/</span>
            <span className="text-[#2A4B35]">{activeLesson.title.toUpperCase()}</span>
          </div>

          {/* Lesson Introduction Content */}
          <section className="space-y-4">
            <h1 className="text-3xl font-serif font-bold text-[#1A1A1A] leading-tight">
              The Spectral Fingerprint of Crops
            </h1>
            <p className="text-sm text-black/80 leading-relaxed max-w-2xl">
              {activeLesson.description}
            </p>
          </section>

          {/* Interactive Bento Graphics Modules */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            
            {/* Spectral Reflectance curve illustration */}
            <div className="md:col-span-8 glass-panel p-5 rounded-2xl relative overflow-hidden bg-white border border-black/10 shadow-sm">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1A1A1A] mb-1">Reflectance Curve</h3>
                  <p className="font-mono text-[9px] text-black/50 uppercase tracking-wider font-semibold">Vegetation Signature (400nm - 1000nm)</p>
                </div>
                <span className="px-2 py-0.5 bg-[#2A4B35]/10 text-[#2A4B35] rounded font-mono text-[8px] border border-[#2A4B35]/20 uppercase font-semibold">
                  Sentinel-2 Data
                </span>
              </div>

              {/* Spectral Reflectance Wave Curve SVG Plot */}
              <div className="h-44 w-full relative mb-4">
                <div className="absolute inset-0 flex items-end justify-between px-2 pb-6 border-b border-l border-black/10">
                  
                  <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 200">
                    <path 
                      d="M 0 180 Q 50 180 100 170 T 200 160 T 250 40 T 300 30 T 400 20" 
                      fill="none" 
                      stroke="#2A4B35" 
                      strokeWidth="3" 
                    />
                    
                    {/* Interactive wavelength bands */}
                    <circle cx="100" cy="170" fill="#dc2626" r="4.5" className="animate-pulse" />
                    <circle cx="300" cy="30" fill="#10b981" r="4.5" className="animate-pulse" />
                  </svg>

                  {/* Spectral frequency horizontal bands */}
                  <div className="absolute -bottom-6 w-full flex justify-between font-mono text-[8px] text-black/60 uppercase font-bold tracking-widest select-none">
                    <span>Blue</span>
                    <span>Green</span>
                    <span className="text-[#dc2626]">Red</span>
                    <span className="text-[#10b981]">NIR</span>
                    <span>SWIR</span>
                  </div>

                </div>
                
                {/* Horizontal spectrum visual gradient banner */}
                <div className="absolute bottom-[-10px] left-0 w-full h-1 spectral-gradient opacity-35 pointer-events-none"></div>
              </div>

              {/* Highlight explanations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
                {activeLesson.highlightBoxes?.map((box, idx) => {
                  let borderColor = 'border-l-[#2A4B35]';
                  if (box.borderColorClass.includes('red')) borderColor = 'border-l-rose-700';
                  else if (box.borderColorClass.includes('yellow') || box.borderColorClass.includes('amber')) borderColor = 'border-l-amber-600';
                  
                  return (
                    <div key={idx} className={`p-3 bg-[#F5F5F0] border border-black/5 rounded-xl border-l-4 ${borderColor}`}>
                      <div className="font-mono text-[9px] font-bold text-[#1A1A1A] uppercase tracking-wider mb-1">{box.title}</div>
                      <p className="text-[11px] text-black/70 leading-relaxed">{box.content}</p>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Microscopic Biology Card */}
            <div className="md:col-span-4 glass-panel p-5 rounded-2xl flex flex-col justify-between bg-white border border-black/10 shadow-sm">
              <div className="space-y-3">
                <div className="w-10 h-10 bg-[#2A4B35]/10 rounded-full flex items-center justify-center text-[#2A4B35]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">Cellular View</h3>
                <p className="text-[11px] text-black/70 leading-relaxed">
                  Inside the leaf, the spongy mesophyll cell layers reflect up to 50% of Near-Infrared (NIR) light. 
                </p>
              </div>

              {activeLesson.image && (
                <div className="mt-4 rounded-xl overflow-hidden border border-black/10 h-32 relative">
                  <img 
                    className="w-full h-full object-cover select-none" 
                    src={activeLesson.image} 
                    alt={activeLesson.imageAlt || "Biology diagram"} 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            {/* Formula display overlay (if present) */}
            {activeLesson.formula && (
              <div className="col-span-12 glass-panel p-6 rounded-2xl border border-[#2A4B35]/20 bg-white shadow-sm">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-1 text-left w-full md:w-auto">
                    <h4 className="font-mono text-[9px] text-[#2A4B35] uppercase tracking-widest font-bold">The Gold Standard</h4>
                    <h2 className="text-lg font-serif font-bold text-[#1A1A1A]">Normalized Difference Vegetation Index</h2>
                  </div>

                  <div className="bg-[#F5F5F0] px-8 py-5 rounded-xl border border-black/10 w-full md:w-auto flex justify-center">
                    <div className="font-sans text-xl font-bold text-[#2A4B35] tracking-wider flex items-center gap-3">
                      <span className="font-mono text-sm text-[#1A1A1A]">{activeLesson.formula.label} =</span>
                      <div className="flex flex-col items-center select-none">
                        <span className="border-b border-black/40 pb-1 text-sm font-mono tracking-widest">{activeLesson.formula.numerator}</span>
                        <span className="pt-1 text-sm font-mono tracking-widest">{activeLesson.formula.denominator}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Knowledge Check Interactive Section */}
          <section className="pt-4 pb-12 text-left">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="text-amber-600 w-5 h-5" />
              <h3 className="text-lg font-serif font-bold text-[#1A1A1A]">Knowledge Check</h3>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-black/10 relative bg-white shadow-sm">
              <span className="absolute -top-3 right-6 bg-amber-600 text-white px-2.5 py-0.5 rounded-full font-mono text-[8px] font-bold uppercase tracking-wider">
                REQUIRED
              </span>

              <p className="text-base font-serif font-bold text-[#1A1A1A] mb-6">
                {activeQuiz.question}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeQuiz.options.map((option, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  const isSelected = selectedOption === idx;
                  const isSubmitted = quizStatus === 'submitted';
                  const isCorrect = idx === activeQuiz.answerIndex;

                  let borderStyle = "border-black/10 bg-[#F5F5F0]";
                  let badgeStyle = "border-black/10 text-black/60";

                  if (isSelected && !isSubmitted) {
                    borderStyle = "border-[#2A4B35] bg-[#2A4B35]/5";
                    badgeStyle = "bg-[#2A4B35] text-white border-transparent font-semibold";
                  } else if (isSubmitted) {
                    if (isCorrect) {
                      borderStyle = "border-emerald-700 bg-emerald-50";
                      badgeStyle = "bg-emerald-700 text-white border-transparent font-bold";
                    } else if (isSelected) {
                      borderStyle = "border-rose-700 bg-rose-50";
                      badgeStyle = "bg-rose-700 text-white border-transparent font-bold";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(idx)}
                      disabled={isSubmitted}
                      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${borderStyle} ${!isSubmitted ? 'cursor-pointer hover:border-[#2A4B35]' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-mono select-none ${badgeStyle}`}>
                        {letter}
                      </div>
                      <span className={`text-xs ${isSubmitted && isCorrect ? 'text-emerald-950 font-semibold' : 'text-black/70'}`}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Show feedback block upon quiz submission */}
              {quizStatus === 'submitted' && (
                <div className="mt-6 p-4 bg-[#F5F5F0] rounded-xl border border-black/10 font-sans space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    {selectedOption === activeQuiz.answerIndex ? (
                      <span className="text-emerald-700 font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Correct Answer
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold text-xs uppercase font-mono tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Incorrect Answer
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-black/80 leading-relaxed">
                    {activeQuiz.explanation}
                  </p>
                </div>
              )}

              {/* Submit & Next Button controls */}
              <div className="mt-6 flex justify-between items-center border-t border-black/10 pt-4">
                <span className="text-black/50 italic text-[10px] opacity-75 font-sans">
                  Choose the best option and click submit.
                </span>
                
                {quizStatus === 'idle' ? (
                  <button 
                    onClick={submitAnswer}
                    disabled={selectedOption === null}
                    className="bg-[#2A4B35] text-white font-mono text-[10px] uppercase font-bold tracking-wider py-2 px-6 rounded-lg disabled:opacity-50 hover:bg-[#3E654C] transition-colors cursor-pointer"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button 
                    onClick={nextQuiz}
                    className="bg-[#F5F5F0] text-[#2A4B35] border border-black/15 font-mono text-[10px] uppercase font-bold tracking-wider py-2 px-6 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                  >
                    Next Question
                  </button>
                )}
              </div>

            </div>
          </section>

        </div>

        {/* Floating Lesson Progression Trigger */}
        <div className="fixed bottom-8 right-8 z-30">
          <button 
            onClick={nextLesson}
            className="flex items-center gap-2.5 bg-[#2A4B35] text-white px-5 py-3.5 rounded-full font-bold shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer font-sans text-xs tracking-wider uppercase"
          >
            <span>Next Lesson: NDVI Calculation</span>
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
        </div>

      </main>

    </div>
  );
}
