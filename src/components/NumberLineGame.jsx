import { useEffect, useMemo, useRef, useState } from 'react';

function getRandomQuestion() {
  const a = Math.floor(Math.random() * 10);
  const maxB = Math.min(9, 10 - a);
  const b = Math.floor(Math.random() * (maxB + 1));

  return { a, b, answer: a + b };
}

function buildExpectedSequence(start, jumpBy) {
  if (jumpBy === 0) {
    return [start, start];
  }

  const target = start + jumpBy;
  const sequence = [];
  for (let n = start + 1; n <= target; n += 1) {
    sequence.push(n);
  }
  sequence.push(target);

  return sequence;
}

function NumberLine({
  hoveredNumber,
  clickedNumbers,
  arrows,
  pointerNumber,
  onClickNumber,
  onHoverNumber
}) {
  const points = useMemo(() => Array.from({ length: 11 }, (_, i) => i), []);
  const arrowStarts = useMemo(() => new Set(arrows.map((arrow) => arrow.from)), [arrows]);

  return (
    <div className="lineWrap" aria-label="數線">
      <div className="lineTrack" />
      <div className="pointRow">
        {points.map((n) => {
          const clicked = clickedNumbers.includes(n);
          const hover = hoveredNumber === n;
          const showCircle = clicked || hover;
          return (
            <button
              className="pointCell"
              key={n}
              type="button"
              onMouseEnter={() => onHoverNumber(n)}
              onMouseLeave={() => onHoverNumber(null)}
              onClick={() => onClickNumber(n)}
            >
              <div className={["pointMark", showCircle ? 'showCircle' : ''].filter(Boolean).join(' ')} />
              <span className="pointLabel">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="arrowRow" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <div className="arrowCell" key={`arrow-${i}`}>
            {arrowStarts.has(i) ? <span className="jumpArrow">→</span> : null}
          </div>
        ))}
      </div>

      <div className="pointerRow" aria-hidden="true">
        {points.map((n) => (
          <div className="pointerCell" key={`pointer-${n}`}>
            {pointerNumber === n ? (
              <div className="pointerHint">
                <span className="pointerArrow">↑</span>
                <span className="pointerText">「＋」見加號</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NumberLineGame() {
  const timersRef = useRef([]);
  const [question, setQuestion] = useState(() => getRandomQuestion());
  const [score, setScore] = useState(0);
  const [hasAwarded, setHasAwarded] = useState(false);
  const [phase, setPhase] = useState(1);
  const [result, setResult] = useState('idle');
  const [isDemo, setIsDemo] = useState(false);
  const [selectedOperand, setSelectedOperand] = useState(null);
  const [clickedNumbers, setClickedNumbers] = useState([]);
  const [hoveredNumber, setHoveredNumber] = useState(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [arrows, setArrows] = useState([]);

  const clearTimers = () => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  };

  const schedule = (callback, delay) => {
    const timer = setTimeout(callback, delay);
    timersRef.current.push(timer);
  };

  useEffect(
    () => () => {
      clearTimers();
    },
    []
  );

  const startValue = selectedOperand === 'a' ? question.a : selectedOperand === 'b' ? question.b : null;
  const jumpBy = selectedOperand === 'a' ? question.b : selectedOperand === 'b' ? question.a : null;
  const expectedSequence = startValue === null || jumpBy === null ? [] : buildExpectedSequence(startValue, jumpBy);

  const beginState3 = () => {
    setPhase(3);
    setProgressIndex(0);
  };

  const resetForQuestion = (nextQuestion = getRandomQuestion()) => {
    clearTimers();
    setQuestion(nextQuestion);
    setHasAwarded(false);
    setPhase(1);
    setResult('idle');
    setIsDemo(false);
    setSelectedOperand(null);
    setClickedNumbers([]);
    setHoveredNumber(null);
    setProgressIndex(0);
    setArrows([]);
  };

  const startDemo = () => {
    clearTimers();

    const demoStart = question.a;
    const demoJumpBy = question.b;
    const demoSequence = buildExpectedSequence(demoStart, demoJumpBy);

    setIsDemo(true);
    setPhase(1);
    setSelectedOperand(null);
    setClickedNumbers([]);
    setHoveredNumber(null);
    setProgressIndex(0);
    setArrows([]);

    schedule(() => {
      setSelectedOperand('a');
      setClickedNumbers([demoStart]);
      setPhase(2);
    }, 700);

    schedule(() => {
      beginState3();
    }, 3700);

    let delay = 4700;
    demoSequence.forEach((value, index) => {
      schedule(() => {
        setClickedNumbers((prev) => (prev.includes(value) ? prev : [...prev, value]));
        const from = index === 0 ? demoStart : demoSequence[index - 1];
        const to = value;
        if (to === from + 1) {
          setArrows((prev) => {
            if (prev.some((arrow) => arrow.from === from && arrow.to === to)) {
              return prev;
            }
            return [...prev, { from, to }];
          });
        }
        setProgressIndex(index + 1);
      }, delay);
      delay += 1000;
    });

    schedule(() => {
      setResult('correct');
      setPhase(4);
      setIsDemo(false);
    }, delay);
  };

  const markWrong = () => {
    clearTimers();
    setResult('wrong');
    setPhase(4);
    schedule(() => {
      startDemo();
    }, 1200);
  };

  const handleClickNumber = (value) => {
    if (isDemo) {
      return;
    }

    if (phase === 1) {
      if (value !== question.a && value !== question.b) {
        markWrong();
        return;
      }

      const operand = value === question.a ? 'a' : 'b';
      setSelectedOperand(operand);
      setClickedNumbers([value]);
      setResult('idle');
      setPhase(2);
      clearTimers();
      schedule(() => {
        beginState3();
      }, 3000);
      return;
    }

    if (phase !== 3) {
      return;
    }

    const expected = expectedSequence[progressIndex];
    if (value !== expected) {
      markWrong();
      return;
    }

    setClickedNumbers((prev) => (prev.includes(value) ? prev : [...prev, value]));

    const from = progressIndex === 0 ? startValue : expectedSequence[progressIndex - 1];
    const to = expected;
    if (to === from + 1) {
      setArrows((prev) => {
        if (prev.some((arrow) => arrow.from === from && arrow.to === to)) {
          return prev;
        }
        return [...prev, { from, to }];
      });
    }

    const nextIndex = progressIndex + 1;
    setProgressIndex(nextIndex);

    if (nextIndex >= expectedSequence.length) {
      if (!hasAwarded) {
        setScore((prev) => prev + question.answer);
        setHasAwarded(true);
      }
      setResult('correct');
      setPhase(4);
      clearTimers();
    }
  };

  const highlightedOperand = phase === 3 && selectedOperand ? (selectedOperand === 'a' ? 'b' : 'a') : null;

  const getPrimaryMessage = () => {
    if (phase === 1) {
      return '圈起點';
    }

    if (phase === 2) {
      return '見加號';
    }

    if (phase === 3) {
      return '向右跳';
    }

    if (result === 'wrong') {
      return '再試一次，我陪你一起跳！';
    }

    if (isDemo) {
      return '數變大！';
    }

    return '數變大！';
  };

  const getSecondaryMessage = () => {
    if (phase === 3) {
      return '雙按以確定最終答案';
    }

    if (phase === 4 && result === 'correct' && !isDemo) {
      return isDemo ? '再試一次，我陪你一起跳！' : '做得好，繼續努力！';
    }

    if (phase === 4 && result === 'wrong') {
      return '即將開始示範流程';
    }

    if (phase === 4 && result === 'correct' && isDemo)

      return '';
  };

  const resultDisplay = phase === 4 && result === 'correct' ? question.answer : '?';

  const pointerNumber = phase === 2 ? startValue : null;

  const resetQuestion = () => {
    resetForQuestion(getRandomQuestion());
  };

  return (
    <section className="gameCard">
      <p className="badge">數線加法小遊戲</p>
      <h1 className="title">一起在數線上算加法</h1>
      <div className="scoreBoard">累積分數：{score}</div>

      <div className="questionBox">
        <span className={["num", highlightedOperand === 'a' ? 'highlightNum' : ''].filter(Boolean).join(' ')}>{question.a}</span>
        <span className="op">+</span>
        <span className={["num", highlightedOperand === 'b' ? 'highlightNum' : ''].filter(Boolean).join(' ')}>{question.b}</span>
        <span className="op">=</span>
        <span className="result">{resultDisplay}</span>
      </div>

      <NumberLine
        hoveredNumber={hoveredNumber}
        clickedNumbers={clickedNumbers}
        arrows={arrows}
        pointerNumber={pointerNumber}
        onClickNumber={handleClickNumber}
        onHoverNumber={setHoveredNumber}
      />

      <div className="guide">
        <div className="guideMain">{getPrimaryMessage()}</div>
        {getSecondaryMessage() ? <div className="guideSub">{getSecondaryMessage()}</div> : null}
      </div>

      <div className="controls">
        <button className="btn nextBtn" onClick={resetQuestion} type="button">
          下一題
        </button>
      </div>
    </section>
  );
}
