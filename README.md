# 6726.Bet

**Plataforma oficial de propriedade de Anthony Ramos : bernardino**

Plataforma de apostas online completa, construída em HTML, CSS e JavaScript puros, pronta para rodar em qualquer hospedagem estática sem dependências externas.

---

## 🚀 Visão Geral

- **Idioma:** Português (Brasil)
- **Stack:** HTML5 + CSS3 + Vanilla JS (ES6+)
- **Persistência:** LocalStorage (simulando `users.json`, `transactions.json`, `config.json`)
- **Responsivo:** Mobile-first
- **Tema:** Cassino escuro com acentos vibrantes

## 📁 Estrutura

```
/
├── index.html                  # Entrada (redireciona para login ou dashboard)
├── README.md
├── css/
│   ├── styles.css              # Layout, componentes, cassino-dark
│   ├── responsive.css          # Breakpoints mobile-first
│   └── animations.css          # Animações, transições, efeitos de cassino
├── js/
│   ├── main.js                 # Bootstrap, roteador SPA leve, navegação inferior
│   ├── auth.js                 # Login / Registro / Logout / Sessão
│   ├── database.js             # Camada de persistência (LocalStorage)
│   ├── games.js                # Engine unificado de slots
│   ├── admin.js                # Painel administrativo
│   ├── chat.js                 # Chat usuário ↔ admin (DEPOSITO-/SAQUE-)
│   └── utils.js                # Helpers (moeda, validação, toast, sons, etc.)
├── games/
│   ├── tiger.js                # Marca Tiger (30 jogos)
│   ├── rabbit.js               # Marca Rabbit (30 jogos)
│   ├── tigrinho.js             # Marca Tigrinho (30 jogos)
│   ├── pg.js                   # Marca PG (30 jogos)
│   ├── spin.js                 # Marca SPIN (30 jogos)
│   ├── dragon.js               # Marca custom Dragon (30 jogos)
│   └── fortune.js              # Marca custom Fortune (30 jogos)
├── pages/
│   ├── dashboard.html          # Início
│   ├── login.html
│   ├── register.html
│   ├── perfil.html
│   ├── deposito.html
│   ├── saque.html
│   ├── vip.html
│   ├── jogos.html              # Lista de marcas
│   ├── jogos2.html             # Lista de jogos por marca
│   ├── jogos3.html             # Tela de jogo
│   ├── config.html
│   └── admin.html
├── database/
│   ├── users.json              # Estrutura de referência (persistência real em LocalStorage)
│   ├── transactions.json
│   └── config.json
└── assets/
    ├── images/
    └── sounds/
```

## 🎮 Sistema de Jogos

- **7 marcas × 30 jogos = 210 jogos**
- Slot machine unificado: 3×3, símbolos temáticos por marca, RTP configurável
- "Modo Vitória" controlado pelo admin por usuário
- Apostas, animações, histórico persistido

## 🔐 Autenticação

- Cadastro / Login / Logout obrigatórios
- Senhas armazenadas com hash simples (SHA-256 via SubtleCrypto)
- Sessão via `sessionStorage`

## 👤 Perfil

- Saldo destacado
- Botões **Depositar** e **Sacar** abrem chat com admin
- Threads automáticas: `DEPOSITO-USERNAME` e `SAQUE-USERNAME`
- Histórico de transações

## 💬 Chat

- Usuário ↔ Admin
- Organizado por `DEPOSITO-NICK` e `SAQUE-NICK`
- Notificações em tempo real (polling local)

## 🎁 Bônus & VIP

- Bônus diário, eventos, recompensas
- Sistema de níveis VIP com progressão por volume apostado

## 🔧 Admin

- Login seguro (padrão: `admin` / `6726admin`)
- CRUD de usuários, edição de saldo e senha
- Ativar/desativar bônus, eventos, "Modo Vitória"
- Visão de economia: total depositado/sacado/apostado/pago
- Gerenciar todos os chats

## ⚙️ Extras

- Notificações in-app
- Leaderboard (ranking dos maiores ganhos)
- Recompensas diárias
- Efeitos sonoros (Web Audio API, sem arquivos externos)
- Animações de carregamento
- Histórico completo de jogadas

## 🔒 Segurança

- Anti-F12 básico (detecção + bloqueio de devtools e atalhos)
- Validação de entrada em todos os formulários
- Checksum de integridade no saldo (protege contra manipulação via DevTools)
- Sanitização de HTML em mensagens de chat

## ▶️ Como rodar

Basta servir a pasta raiz em qualquer hospedagem estática:

```bash
# Exemplo local
python3 -m http.server 8080
# Abra http://localhost:8080/
```

Não há build step, não há dependências NPM, não há backend.

## 👑 Credenciais padrão

- **Admin:** `admin` / `6726admin`

O primeiro usuário cadastrado recebe R$ 0,00 de saldo inicial. Use o painel admin para creditar saldo manualmente (depósitos são confirmados via chat).

---

© 6726.Bet — Anthony Ramos : bernardino
