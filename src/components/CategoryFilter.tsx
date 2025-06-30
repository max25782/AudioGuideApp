import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { PointCategory } from '../types';

export interface CategoryFilterProps {
  categories: PointCategory[];
  selectedCategory: PointCategory | 'all';
  onCategorySelect: (categoryId: PointCategory | 'all') => void;
  getCategoryName: (category: PointCategory) => string;
  getCategoryColor: (category: PointCategory) => string;
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onCategorySelect,
  getCategoryName,
  getCategoryColor,
}: CategoryFilterProps) {
  const allCategories: (PointCategory | 'all')[] = ['all', ...categories];

  const renderCategory = (categoryId: PointCategory | 'all') => {
    const isSelected = selectedCategory === categoryId;
    const categoryName = categoryId === 'all' ? 'Все' : getCategoryName(categoryId);
    const categoryColor = categoryId === 'all' ? '#007AFF' : getCategoryColor(categoryId);

    return (
      <TouchableOpacity
        key={categoryId}
        style={[
          styles.categoryButton,
          isSelected && { backgroundColor: categoryColor },
          !isSelected && { borderColor: categoryColor, borderWidth: 1 },
        ]}
        onPress={() => onCategorySelect(categoryId)}
      >
        <Text
          style={[
            styles.categoryText,
            isSelected && { color: '#fff' },
            !isSelected && { color: categoryColor },
          ]}
        >
          {categoryName}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Категории</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {allCategories.map(renderCategory)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  scrollContent: {
    paddingRight: 20,
  },
  categoryButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 