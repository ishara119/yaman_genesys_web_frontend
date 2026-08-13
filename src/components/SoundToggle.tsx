import { useBackgroundMusic } from '../hooks/useBackgroundMusic';

export default function SoundToggle() {
  const { playing, toggle } = useBackgroundMusic();

  return (
    <button
      type="button"
      className={`sound-toggle${playing ? ' playing' : ''}`}
      onClick={toggle}
      aria-pressed={playing}
      aria-label={playing ? 'Mute background music' : 'Play background music'}
    >
      <span className="sound-toggle-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="sound-toggle-label">{playing ? 'SOUND: ON' : 'SOUND: OFF'}</span>
    </button>
  );
}
