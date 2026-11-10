
/**
 * ChecklistComponent.js
 * Componente de checklist para estandarizar la limpieza.
 * HU-10: Mucama marca checklist según tipo de habitación.
 * HU-11: Requisito antes de pasar habitación a disponible.
 * HU-12: Checklists propios de cada área.
 */

import React, { useState, useEffect } from 'react';

import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import { colors, fonts, spacing, radius } from '../theme';

import {
  toggleChecklistItem,
  todosCompletados,
} from '../checklistTypes';


/**
 * ChecklistItem
 * Un solo ítem del checklist con checkbox visual.
 */
function ChecklistItem({ item, onToggle, index }) {
  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => onToggle(item.id)}
      activeOpacity={0.7}
    >
      <View style={styles.checkWrapper}>
        <View
          style={[
            styles.checkBox,
            {
              backgroundColor: item.completed
                ? colors.primary
                : colors.white,
              borderColor: item.completed
                ? colors.primary
                : colors.textMuted,
            },
          ]}
        >
          <Text style={styles.checkText}>
            {item.completed ? '✓' : ''}
          </Text>
        </View>

        <Text
          style={[
            styles.itemText,
            item.completed && styles.itemTextCompleted,
          ]}
        >
          {item.label}
        </Text>
      </View>

      <View
        style={[
          styles.badge,
          {
            backgroundColor: item.completed
              ? colors.primaryLight
              : colors.textMuted,
          },
        ]}
      >
        <Text style={styles.badgeText}>
          {index + 1}
        </Text>
      </View>
    </TouchableOpacity>
  );
}


/**
 * ChecklistComponent
 * Componente de checklist visualizable y editable.
 */
export default function ChecklistComponent({
  title,
  items,
  onSave,
  onReset,
  showProgress = true,
}) {
  const [itemsLocal, setItemsLocal] = useState(items || []);

  // Sincronizar cuando cambien los elementos recibidos.
  useEffect(() => {
    setItemsLocal(items || []);
  }, [items]);

  const allCompleted = todosCompletados(itemsLocal);

  const completedCount = itemsLocal.filter(
    (item) => item.completed
  ).length;

  const handleToggle = (itemId) => {
    setItemsLocal((currentItems) =>
      toggleChecklistItem(currentItems, itemId)
    );
  };

  const handleSave = () => {
    if (onSave) {
      onSave(itemsLocal);
    }
  };

  const handleReset = () => {
    setItemsLocal(items || []);

    if (onReset) {
      onReset();
    }
  };

  return (
    <View style={styles.screen}>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ENCABEZADO */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {title}
          </Text>

          {showProgress && (
            <View style={styles.progressBar}>
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {allCompleted
                    ? '✓ Completo'
                    : `${completedCount}/${itemsLocal.length} completado(s)`}
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        itemsLocal.length > 0
                          ? (completedCount / itemsLocal.length) * 100
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>
          )}
        </View>

        {/* LISTA DE CHECKLIST */}
        <View style={styles.listContainer}>
          {itemsLocal.map((item, index) => (
            <ChecklistItem
              key={item.id}
              item={item}
              onToggle={handleToggle}
              index={index}
            />
          ))}
        </View>

      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>

        <View style={styles.actions}>

          <TouchableOpacity
            onPress={handleReset}
            style={styles.btnReset}
            activeOpacity={0.7}
          >
            <Text style={styles.btnText}>
              Restablecer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            style={styles.btnSave}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSaveText}>
              Guardar
            </Text>
          </TouchableOpacity>

        </View>

        <View style={styles.progressFoot}>
          <Text style={styles.progressTextFoot}>
            {allCompleted
              ? 'Checklist completado'
              : 'Checklist pendiente'}
          </Text>
        </View>

      </View>

    </View>
  );
}


// ESTILOS
const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  container: {
    flexGrow: 1,
  },

  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },

  title: {
    fontFamily: fonts.title,
    fontSize: 20,
    color: colors.primary,
  },

  progressBar: {
    marginTop: spacing.md,
    gap: 8,
  },

  progressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.text,
  },

  progressTrack: {
    height: 7,
    backgroundColor: colors.border,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
  },

  listContainer: {
    padding: 0,
  },

  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },

  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },

  btnReset: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },

  btnText: {
    color: colors.primary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },

  btnSave: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },

  btnSaveText: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },

  progressFoot: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },

  progressTextFoot: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },

  checkWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    gap: spacing.md,
  },

  checkBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  checkText: {
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.white,
  },

  itemText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },

  itemTextCompleted: {
    color: colors.textMuted,
  },

  badge: {
    minWidth: 25,
    height: 25,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.white,
  },

});
