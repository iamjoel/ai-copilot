import { useState, useEffect } from 'react'

import './index.css'

const slides = [
  {
    type: 'cover',
    title: 'Large Language Models',
    subtitle: 'Probabilistic Systems',
    content: 'Modeling language through statistics.',
    bg: '--pop-yellow'
  },
  {
    type: 'section',
    title: 'The Big 3',
    subtitle: 'Core Principles',
    content: '1. Next-Token Prediction\n2. High-Dim Representation\n3. Compression',
    bg: '--pop-blue'
  },
  {
    type: 'content',
    number: '01',
    title: 'Next-Token Prediction',
    image: '/images/next_token.png',
    caption: 'It\'s not thinking.\nIt\'s predicting P(token | context).',
    bg: '--pop-white'
  },
  {
    type: 'content',
    number: '02',
    title: 'Representation via Scale',
    image: '/images/representation.png',
    caption: 'Attention + Scale =\nMapping Meaning in Space.',
    bg: '--pop-white'
  },
  {
    type: 'content',
    number: '03',
    title: 'Compression = Generalization',
    image: '/images/compression.png',
    caption: 'Intelligence emerges from\ncompressing patterns.',
    bg: '--pop-white'
  },
  {
    type: 'final',
    title: 'Boundaries',
    image: '/images/limitations.png',
    content: 'No Truth.\nNo Agency.\nNo World Model.',
    footer: 'Just powerful pattern matching.',
    bg: '--pop-red'
  }
];

function App() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent(c => Math.min(c + 1, slides.length - 1));
  const prev = () => setCurrent(c => Math.max(c - 1, 0));

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const slide = slides[current];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '2rem',
      position: 'relative'
    }}>
      {/* Background Decor */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '300px',
        height: '300px',
        background: 'var(--pop-purple)',
        borderRadius: '50%',
        zIndex: -1,
        border: '4px solid black'
      }}></div>

      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '-5%',
        width: '200px',
        height: '200px',
        background: 'var(--pop-blue)',
        transform: 'rotate(45deg)',
        zIndex: -1,
        border: '4px solid black'
      }}></div>

      <main className="pop-box" style={{
        width: '100%',
        maxWidth: '1000px',
        height: '700px',
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        position: 'relative',
        background: `var(${slide.bg})`,
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          display: 'flex',
          gap: '10px',
          zIndex: 20
        }}>
          <div className="pop-tag">SLIDE {current + 1}/{slides.length}</div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <SlideContent slide={slide} />
        </div>

        <div style={{
          marginTop: 'auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '1rem',
          zIndex: 10
        }}>
          <button className="pop-btn" onClick={prev} disabled={current === 0}>
            Prev
          </button>
          <button className="pop-btn" onClick={next} disabled={current === slides.length - 1}>
            Next
          </button>
        </div>
      </main>
    </div>
  )
}

function SlideContent({ slide }) {
  if (slide.type === 'cover') {
    return (
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '6rem', marginBottom: '1rem', color: 'var(--pop-white)', textShadow: '6px 6px 0px black' }}>
          {slide.title}
        </h1>
        <h2 style={{
          fontSize: '3rem',
          background: 'var(--pop-black)',
          color: 'var(--pop-white)',
          display: 'inline-block',
          padding: '1rem 2rem',
          transform: 'rotate(-2deg)',
          textShadow: 'none',
          letterSpacing: '3px'
        }}>
          {slide.subtitle}
        </h2>
        <div style={{ marginTop: '4rem' }}>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{slide.content}</p>
        </div>
      </div>
    )
  }

  if (slide.type === 'section') {
    return (
      <div style={{ textAlign: 'center', color: 'var(--pop-white)' }}>
        <h1 style={{ fontSize: '5rem', textShadow: '4px 4px 0px black' }}>{slide.title}</h1>
        <div style={{ width: '150px', height: '10px', background: 'black', margin: '2rem auto' }}></div>
        <div style={{
          fontSize: '2.5rem',
          background: 'rgba(255,255,255,0.9)',
          color: 'black',
          padding: '3rem',
          border: '4px solid black',
          boxShadow: '8px 8px 0px rgba(0,0,0,0.5)',
          display: 'inline-block',
          textAlign: 'left'
        }}>
          {slide.content.split('\n').map((line, i) => (
            <div key={i} style={{ marginBottom: '1rem' }}>{line}</div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.type === 'content') {
    return (
      <div style={{ display: 'flex', height: '100%', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <h2 style={{
            fontSize: '3rem',
            marginBottom: '1rem',
            color: 'var(--pop-blue)',
            textShadow: '2px 2px 0px black',
            lineHeight: 1
          }}>
            {slide.title}
          </h2>
          <div style={{
            fontSize: '2rem',
            borderLeft: '8px solid var(--pop-purple)',
            paddingLeft: '1.5rem',
            fontWeight: 'bold',
            whiteSpace: 'pre-wrap'
          }}>
            {slide.caption}
          </div>

          <div style={{
            fontSize: '12rem',
            fontFamily: 'Bangers',
            opacity: 0.1,
            position: 'absolute',
            bottom: '-50px',
            left: '0',
            color: 'var(--pop-black)',
            zIndex: -1
          }}>
            {slide.number}
          </div>
        </div>

        <div style={{
          flex: 1,
          border: '4px solid black',
          boxShadow: '10px 10px 0px var(--pop-black)',
          background: 'white',
          padding: '10px',
          transform: 'rotate(2deg)'
        }}>
          <img src={slide.image} alt={slide.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      </div>
    )
  }

  if (slide.type === 'final') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--pop-white)', textShadow: '4px 4px 0px black' }}>
          {slide.title}
        </h1>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', width: '100%' }}>

          <div style={{ flex: 1 }}>
            <img src={slide.image} alt="limitations" style={{
              width: '100%',
              border: '4px solid black',
              boxShadow: '8px 8px 0px black'
            }} />
          </div>

          <div style={{
            flex: 1,
            background: 'var(--pop-white)',
            padding: '2rem',
            border: '4px solid black',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            {slide.content.split('\n').map((p, i) => <div key={i}>{p}</div>)}
          </div>
        </div>

        <div style={{
          marginTop: '2rem',
          background: 'var(--pop-yellow)',
          padding: '1rem 3rem',
          border: '3px solid black',
          fontWeight: 'bold',
          fontSize: '1.5rem',
          transform: 'rotate(-1deg)'
        }}>
          ⚠️ {slide.footer}
        </div>
      </div>
    )
  }

  return null;
}

export default App
