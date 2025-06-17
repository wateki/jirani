import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface FavoritesContextType {
  favorites: string[];
  addToFavorites: (productId: string) => void;
  removeFromFavorites: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  clearFavorites: () => void;
  favoritesCount: number;
  setStoreId: (storeId: string | null) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const getFavoritesKey = (storeId: string | null) => {
  return storeId ? `jirani_favorites_${storeId}` : 'jirani_favorites_global';
};

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);

  // Load favorites from localStorage when store changes
  useEffect(() => {
    if (!currentStoreId) {
      setFavorites([]);
      return;
    }

    try {
      const favoritesKey = getFavoritesKey(currentStoreId);
      const saved = localStorage.getItem(favoritesKey);
      if (saved) {
        const parsedFavorites = JSON.parse(saved);
        if (Array.isArray(parsedFavorites)) {
          setFavorites(parsedFavorites);
        } else {
          setFavorites([]);
        }
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
      // Clear corrupted data
      const favoritesKey = getFavoritesKey(currentStoreId);
      localStorage.removeItem(favoritesKey);
      setFavorites([]);
    }
  }, [currentStoreId]);

  // Save to localStorage whenever favorites change
  useEffect(() => {
    if (!currentStoreId) return;

    try {
      const favoritesKey = getFavoritesKey(currentStoreId);
      localStorage.setItem(favoritesKey, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, [favorites, currentStoreId]);

  const addToFavorites = (productId: string) => {
    setFavorites(prev => {
      if (!prev.includes(productId)) {
        return [...prev, productId];
      }
      return prev;
    });
  };

  const removeFromFavorites = (productId: string) => {
    setFavorites(prev => prev.filter(id => id !== productId));
  };

  const isFavorite = (productId: string) => {
    return favorites.includes(productId);
  };

  const toggleFavorite = (productId: string) => {
    if (isFavorite(productId)) {
      removeFromFavorites(productId);
    } else {
      addToFavorites(productId);
    }
  };

  const clearFavorites = () => {
    setFavorites([]);
  };

  const setStoreId = (storeId: string | null) => {
    setCurrentStoreId(storeId);
  };

  const value: FavoritesContextType = {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    favoritesCount: favorites.length,
    setStoreId
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}; 