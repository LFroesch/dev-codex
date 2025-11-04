import React from 'react';
import TabGroup from '../common/TabGroup';
import TabButton from '../common/TabButton';

interface CategorySelectorProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
  categories: Record<string, any[]>;
  getContrastColor: () => string;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategory,
  onCategoryChange,
  categories,
  getContrastColor
}) => {
  if (Object.keys(categories).length === 0) {
    return null;
  }

  const totalCount = Object.values(categories).flat().length;

  return (
    <TabGroup>
      <TabButton
        isActive={selectedCategory === null}
        onClick={() => onCategoryChange(null)}
        getContrastColor={getContrastColor}
      >
        <span>All <span className="text-xs opacity-60">({totalCount})</span></span>
      </TabButton>

      {Object.entries(categories).map(([category, projects]) => (
        <TabButton
          key={category}
          isActive={selectedCategory === category}
          onClick={() => onCategoryChange(category)}
          getContrastColor={getContrastColor}
        >
          <span>{category} <span className="text-xs opacity-60">({projects.length})</span></span>
        </TabButton>
      ))}
    </TabGroup>
  );
};

export default CategorySelector;
