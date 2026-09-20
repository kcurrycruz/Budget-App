export type PlaidConnectButtonProps = {
  appearance?: 'primary' | 'secondary';
  enabled: boolean;
  itemId?: string;
  label?: string;
  onConnected: () => Promise<void>;
};
