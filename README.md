# AunordMED Financeiro v2.0

Sistema de gestão financeira para PJ coletiva médica.

## Deploy no Vercel

### 1. Subir no GitHub
1. Crie um novo repositório: `aunordmed-app`
2. Faça upload de todos os arquivos desta pasta

### 2. Conectar ao Vercel
1. Acesse [vercel.com](https://vercel.com)
2. New Project → Import do GitHub → selecione `aunordmed-app`
3. Framework: **Create React App**
4. Em **Environment Variables**, adicione:
   - `REACT_APP_SUPABASE_URL` = `https://hleesgnzpkjuhjshyaal.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY` = sua chave anon
   - `REACT_APP_BASE_URL` = URL do Vercel (após primeiro deploy)
5. Deploy!

### 3. Executar SQL no Supabase
Execute o arquivo `SQL_V2_EXECUTE.sql` no SQL Editor do Supabase.

### 4. Criar usuários
No Supabase → Authentication → Users → Add user
Cadastre o e-mail e senha de cada membro da equipe.

## Tecnologias
- React 18
- React Router 6
- Supabase (banco + auth)
- Recharts (gráficos)
- Vercel (hospedagem)
