import { useState } from "react";
import "./lifecycle.css";
import "./avatar.css";

const stages = [
  ["Challenge Identification", "Define the department outcome, constraints, budget and timeline."],
  ["Startup Discovery", "Match the challenge with relevant registered startups and technology fit."],
  ["Eligibility Screening", "Check registration, recognition, experience and required evidence."],
  ["Expert Evaluation", "Apply the same weighted rubric for innovation, feasibility, cost, security and scale."],
  ["Pilot Design", "Lock a safe sandbox scope, duration, data policy and success measures."],
  ["Milestone Contracting", "Create a structured agreement and tie payments to verified progress."],
  ["Performance and Payment", "Measure locked KPIs and release milestone payment after confirmation."],
  ["Independent Validation", "Review pilot evidence through an evaluator with no conflict of interest."],
  ["Scale-up Decision", "Use evidence to recommend expansion, another pilot or closure; humans decide."],
];

export default function LifecycleWalkthrough({ avatarSrc, avatarState, onNarrate }) {
  const [active, setActive] = useState(0);
  const select = (index) => { setActive(index); onNarrate?.(`${stages[index][0]}. ${stages[index][1]}`); };
  return <div className="lifecycle-walkthrough"><div className="walkthrough-horizon"/><div className={`walkthrough-guide avatar-${avatarState}`}><div className="walkthrough-guide-halo"/><img src={avatarSrc} alt="Vyavsay guide accompanying the walkthrough"/></div><div className="walkthrough-path">{stages.map((stage, index) => <button key={stage[0]} className={`walkthrough-room ${index === active ? "active" : ""}`} onClick={() => select(index)} aria-label={`Enter ${stage[0]}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage[0]}</strong></button>)}</div><div className="walkthrough-card"><small>STAGE {active + 1} OF 9</small><strong>{stages[active][0]}</strong><p>{stages[active][1]}</p><div><button onClick={() => select(Math.max(0, active - 1))} disabled={active === 0}>Previous</button><button onClick={() => select(Math.min(stages.length - 1, active + 1))} disabled={active === stages.length - 1}>Next stage</button></div></div></div>;
}
