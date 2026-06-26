-- ══════════════════════════════════════════════════════════
-- AUNORDMED v2.0 — Novas tabelas
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════

-- Tomadores / Planos de saúde
CREATE TABLE IF NOT EXISTS tomadores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cnpj text,
  contato text,
  email text,
  telefone text,
  obs text,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE tomadores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acesso_tomadores" ON tomadores;
CREATE POLICY "acesso_tomadores" ON tomadores FOR ALL USING (true) WITH CHECK (true);

-- Contas a pagar e receber
CREATE TABLE IF NOT EXISTS contas_pagar_receber (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL, -- 'pagar' ou 'receber'
  descricao text NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  competencia text,
  status text DEFAULT 'pendente', -- pendente, pago, cancelado
  categoria text, -- aluguel, imposto, repasse, honorario, etc
  medico_nome text,
  tomador text,
  data_pagamento date,
  obs text,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE contas_pagar_receber ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acesso_contas" ON contas_pagar_receber;
CREATE POLICY "acesso_contas" ON contas_pagar_receber FOR ALL USING (true) WITH CHECK (true);

-- Impostos a recolher
CREATE TABLE IF NOT EXISTS impostos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia text NOT NULL,
  tipo text NOT NULL, -- IRPJ, CSLL, PIS, COFINS, ISS
  base_calculo numeric,
  aliquota numeric,
  valor numeric NOT NULL,
  vencimento date,
  status text DEFAULT 'pendente', -- pendente, pago
  data_pagamento date,
  guia text,
  obs text,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE impostos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acesso_impostos" ON impostos;
CREATE POLICY "acesso_impostos" ON impostos FOR ALL USING (true) WITH CHECK (true);

-- Procedimentos / tabela de valores
CREATE TABLE IF NOT EXISTS procedimentos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text,
  descricao text NOT NULL,
  valor numeric,
  tomador text,
  obs text,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE procedimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acesso_procedimentos" ON procedimentos;
CREATE POLICY "acesso_procedimentos" ON procedimentos FOR ALL USING (true) WITH CHECK (true);

-- Log de auditoria
CREATE TABLE IF NOT EXISTS auditoria (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_email text,
  acao text NOT NULL,
  tabela text,
  registro_id text,
  dados jsonb,
  criado_em timestamptz DEFAULT now()
);
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "acesso_auditoria" ON auditoria;
CREATE POLICY "acesso_auditoria" ON auditoria FOR ALL USING (true) WITH CHECK (true);

-- Adicionar campos nas tabelas existentes
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS meta_mensal numeric;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS data_inicio date;
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS procedimentos jsonb;
ALTER TABLE notas_fiscais ADD COLUMN IF NOT EXISTS centro_custo text;
