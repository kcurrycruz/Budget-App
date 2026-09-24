import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
  cancelLabel?: string;
  confirmLabel?: string;
  message: string;
  title: string;
};

const webMessage = (title: string, message: string) => `${title}\n\n${message}`;

export function showMessage(title: string, message: string) {
  if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
    globalThis.alert(webMessage(title, message));
    return;
  }

  Alert.alert(title, message);
}

export function confirmAction({
  cancelLabel = 'Cancel',
  confirmLabel = 'Delete',
  message,
  title,
}: ConfirmOptions) {
  if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
    return Promise.resolve(globalThis.confirm(webMessage(title, message)));
  }

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
