import Countdown from './Countdown';

export default function Hero() {
  return (
    <main className="hero">
      <img
        className="ghost-wordmark"
        src="/genesys-logo.png"
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <p className="visually-hidden">
        Genesys — Industrial EDM concert, November 21st 2026, Cey Nor, Colombo
      </p>
      <Countdown />
      <button
        type="button"
        className="cta-button"
        data-text="GET TICKETS"
        disabled
        aria-disabled="true"
      >
        <span>GET TICKETS</span>
      </button>
    </main>
  );
}
