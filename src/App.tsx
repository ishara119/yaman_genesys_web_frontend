import BackgroundCanvas from './components/BackgroundCanvas';
import Header from './components/Header';
import Hero from './components/Hero';
import DataOverlay from './components/DataOverlay';
import Footer from './components/Footer';

function App() {
  return (
    <>
      <BackgroundCanvas />
      <div className="vignette" aria-hidden="true" />

      <Header />
      <Hero />

      <DataOverlay
        position="tl"
        lines={[
          <>SYS.STATUS: <span className="ok">ONLINE</span></>,
          'PWR: 100%',
        ]}
      />
      <DataOverlay position="tr" lines={['LAT: 34.0522° N', 'LNG: 118.2437° W']} />
      <DataOverlay position="bl" lines={['SYNC: 99.9%', 'NODE: 07 / GX']} />
      <DataOverlay position="br" lines={['REC • FRAME_0042', 'SIG: STABLE']} />

      <Footer />
    </>
  );
}

export default App;
