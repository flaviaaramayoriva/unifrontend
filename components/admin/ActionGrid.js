import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CARD_MARGIN = 12;
const MIN_CARD_WIDTH_ACTIONS = 210;
const MAX_COLUMNS_ACTIONS = 3;

const ActionCard = ({ action, onPress, cardWidth, index, colors }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index, 6) * 70,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  const onPressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={`Acción: ${action.title}`}
      style={{ margin: CARD_MARGIN / 2, width: cardWidth }}
      activeOpacity={1}
    >
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconTile, { backgroundColor: action.color + '15' }]}>
            <Ionicons name={action.iconName} size={26} color={action.color} />
          </View>
          {action.badge ? (
            <View style={[styles.badge, { backgroundColor: action.badgeColor || colors.primary }]}>
              <Text style={styles.badgeText} numberOfLines={1}>{action.badge}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {action.title}
          </Text>
          {action.description ? (
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {action.description}
            </Text>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.enterText, { color: colors.primary }]}>Entrar</Text>
          <View style={[styles.enterCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="arrow-forward" size={15} color={colors.primary} />
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const ActionGrid = ({ actions, onActionPress, colors }) => {
  const { width: windowWidth } = useWindowDimensions();

  let numColumns = Math.floor(windowWidth / (MIN_CARD_WIDTH_ACTIONS + CARD_MARGIN));
  numColumns = Math.min(numColumns, MAX_COLUMNS_ACTIONS);
  const columns = numColumns > 0 ? numColumns : 1;
  const totalMargin = CARD_MARGIN * (columns - 1);
  const cardWidth = Math.max((windowWidth - 40 - totalMargin) / columns, MIN_CARD_WIDTH_ACTIONS);

  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionKicker, { color: colors.primary }]}>Accesos rápidos</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Herramientas de Gestión</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Acceda a las funcionalidades principales
        </Text>
      </View>
      <FlatList
        data={actions}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ActionCard
            action={item}
            onPress={() => onActionPress(item)}
            cardWidth={cardWidth}
            index={index}
            colors={colors}
          />
        )}
        numColumns={columns}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        key={columns}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 32,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  sectionKicker: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    height: 190,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconTile: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  enterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  enterCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ActionGrid;