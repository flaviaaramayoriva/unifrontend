import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

const COLORS = {
  primary: '#E95A0C',
  logout: '#e74c3c',
  white: '#fff',
  darkText: '#1e293b',
  grayText: '#64748b',
  background: '#f8fafc',
  surface: '#ffffff',
};

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  cancelText?: string;
  confirmText?: string;
  confirmDestructive?: boolean;
}

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  cancelText = 'Cancelar',
  confirmText = 'Confirmar',
  confirmDestructive = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                confirmDestructive && { backgroundColor: COLORS.logout },
              ]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    width: Platform.OS === 'web' ? 400 : '80%',
    maxWidth: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.darkText,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: COLORS.grayText,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    color: COLORS.grayText,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
});

export default CustomAlert;