import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-qr-code';

const BOT_USERNAME = 'EventUniBot';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

const TelegramModal = ({ visible, onClose, isLinked, username, onUnlink, onRefresh, colors }) => {
  const openBot = () => {
    const url = `https://t.me/${BOT_USERNAME}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      import('expo-linking').then(({ default: Linking }) => {
        Linking.openURL(url).catch(() => {
          Alert.alert(
            'Telegram no instalado',
            'Instala Telegram para continuar',
            [
              { text: 'Cancelar' },
              {
                text: 'Instalar',
                onPress: () => Linking.openURL('https://telegram.org/dl')
              }
            ]
          );
        });
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="send" size={48} color="#0088cc" />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {isLinked ? 'Telegram Vinculado ✓' : 'Vincular Telegram'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {isLinked ? (
              <>
                <View style={styles.linkedInfo}>
                  <Ionicons name="checkmark-circle" size={60} color={colors.success} />
                  <Text style={[styles.linkedText, { color: colors.textPrimary }]}>
                    Tu cuenta está vinculada con Telegram
                  </Text>
                  {username && (
                    <Text style={[styles.username, { color: colors.textSecondary }]}>
                      @{username}
                    </Text>
                  )}
                </View>

                <View style={[styles.benefits, { backgroundColor: colors.background }]}>
                  <Text style={[styles.benefitsTitle, { color: colors.textPrimary }]}>
                    Recibirás notificaciones de:
                  </Text>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                      Aprobación de eventos
                    </Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                      Rechazo de eventos (con motivo)
                    </Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                      Recordatorios 3 días antes del evento
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.unlinkButton} onPress={onUnlink}>
                  <Ionicons name="link-outline" size={20} color={colors.accent} />
                  <Text style={[styles.unlinkText, { color: colors.accent }]}>Desvincular Telegram</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={[styles.qrContainer, { backgroundColor: colors.background }]}>
                  <Text style={[styles.qrTitle, { color: colors.textPrimary }]}>
                    Escanea para vincular
                  </Text>
                  <View style={styles.qrCode}>
                    <QRCode
                      value={`https://t.me/${BOT_USERNAME}`}
                      size={180}
                      color="#000"
                      backgroundColor="#fff"
                    />
                  </View>
                  <Text style={[styles.qrSubtitle, { color: colors.textSecondary }]}>
                    O toca el botón para abrir
                  </Text>
                </View>

                <TouchableOpacity style={styles.openButton} onPress={openBot}>
                  <Ionicons name="send" size={20} color={colors.white} />
                  <Text style={styles.openButtonText}>Abrir Bot en Telegram</Text>
                </TouchableOpacity>

                <View style={[styles.steps, { backgroundColor: colors.background }]}>
                  <Text style={[styles.stepsTitle, { color: colors.textPrimary }]}>
                    Pasos a seguir:
                  </Text>

                  <View style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Abre el bot en Telegram (escanea o toca el botón)
                    </Text>
                  </View>

                  <View style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Envía el comando <Text style={[styles.command, { color: colors.primary, backgroundColor: `${colors.primary}20` }]}>/start</Text>
                    </Text>
                  </View>

                  <View style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      El bot te pedirá tu email institucional
                    </Text>
                  </View>

                  <View style={styles.step}>
                    <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                      <Text style={styles.stepNumberText}>4</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                      Envía tu email y listo ✓
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.refreshButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    onRefresh();
                    showAlert(
                      'Verificando...',
                      'Si ya vinculaste en Telegram, presiona nuevamente para actualizar'
                    );
                  }}
                >
                  <Ionicons name="refresh-outline" size={20} color={colors.white} />
                  <Text style={styles.refreshText}>Ya vinculé mi cuenta</Text>
                </TouchableOpacity>
              </>
            )}
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
  content: {
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,136,204,0.12)',
    borderBottomWidth: 1,
    position: 'relative',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
  },
  body: {
    padding: 24,
  },
  linkedInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  linkedText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  username: {
    fontSize: 14,
    marginTop: 4,
  },
  benefits: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    fontSize: 14,
  },
  unlinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: `${'#DC2626'}15`,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  unlinkText: {
    fontSize: 15,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  qrCode: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
  },
  qrSubtitle: {
    fontSize: 13,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0088cc',
    marginBottom: 20,
  },
  openButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  steps: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  command: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  refreshText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default TelegramModal;