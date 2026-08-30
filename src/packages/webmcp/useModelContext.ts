import { useContext } from 'react';
import { WebMcpContext } from './WebMcpProvider';
import { WebMcpContextValue } from './types';

export function useModelContext(): WebMcpContextValue {
  const context = useContext(WebMcpContext);
  if (!context) {
    throw new Error('useModelContext must be used within a <WebMcpProvider>');
  }
  return context;
}
