import { useCallback, useEffect, useRef, useState } from 'react';
import { MusicEngine } from '../audio/musicEngine';

export function useBackgroundMusic() {
  const engineRef = useRef<MusicEngine | null>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = useCallback(() => {
    if (!engineRef.current) engineRef.current = new MusicEngine();
    const engine = engineRef.current;

    if (engine.isPlaying()) {
      engine.stop();
      setPlaying(false);
    } else {
      engine.start();
      setPlaying(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  return { playing, toggle };
}
