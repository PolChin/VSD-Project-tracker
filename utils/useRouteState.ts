import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const hasSameValue = (left: unknown, right: unknown) =>
  Object.is(left, right) || JSON.stringify(left) === JSON.stringify(right);

export const useRouteState = <T,>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const [value, setValue] = useState<T>(() => {
    const state = location.state as Record<string, unknown> | null;
    return state && Object.prototype.hasOwnProperty.call(state, key) ? state[key] as T : initialValue;
  });

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    const currentState = location.state && typeof location.state === 'object'
      ? location.state as Record<string, unknown>
      : {};
    if (hasSameValue(currentState[key], value)) return;
    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
      state: { ...currentState, [key]: value }
    });
  }, [key, location.hash, location.pathname, location.search, location.state, navigate, value]);

  return [value, setValue];
};
