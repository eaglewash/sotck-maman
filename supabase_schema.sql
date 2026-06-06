-- =====================================================
-- MON GARDE-MANGER — Schéma Supabase
-- Coller ce script dans l'éditeur SQL de Supabase
-- =====================================================

-- Table des articles (stock)
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pièce(s)',
  category TEXT NOT NULL DEFAULT 'Autre',
  min_quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des recettes
CREATE TABLE recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  servings INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des ingrédients par recette
CREATE TABLE recipe_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL
);

-- Table de l'historique d'utilisation
CREATE TABLE usage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL,
  recipe_name TEXT NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activer RLS et autoriser l'accès (app personnelle, pas d'auth)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Accès public items"              ON items              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public recipes"            ON recipes            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public recipe_ingredients" ON recipe_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Accès public usage_history"      ON usage_history      FOR ALL USING (true) WITH CHECK (true);
