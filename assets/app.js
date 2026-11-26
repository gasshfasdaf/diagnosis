/* ============================================================
   ДИАГНОСТИКА PWA — основная логика (MVP, localStorage)
   ============================================================ */

const App = (() => {
    // ---------- КОНСТАНТЫ ----------
    const STORAGE_KEY = 'diag_pwa_v1';
    const SESSION_KEY = 'diag_pwa_session';
    const PROMO_CODE = '123';
    const PHOTOS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 168 часов
    const PERMANENT_GROUPS = ['7']; // группа 7 — фото вечные

    // ---------- СОСТОЯНИЕ ----------
    let state = {
        sheets: [],
        session: null,
        currentTab: 'actual',
        currentSheetId: null,
        currentIterationId: null,
        searchQuery: '',
        pdfIterationId: null
    };

    // ---------- СПРАВОЧНИК ЧЕК-ЛИСТА ----------
    // Определяем структуру групп и пунктов.
    // Каждый пункт: { id, title, options: ['З','Ж','К'] | ['З','Ж/К','К'], toggleable: bool, hasPhoto: bool }
    const CHECKLIST_TEMPLATE = [
        {
            code: '1', title: '1. Тест-драйв', items: [
                { code: '1.1', title: 'Работа ДВС', options: ['З', 'Ж', 'К'], hasPhoto: false, toggleable: false },
                { code: '1.2', title: 'Работа КПП', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '1.3', title: 'Работа сцепления МТ / АМТ', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '1.4', title: 'Рулевое управление, ходовая часть', options: ['З', 'К'], hasPhoto: false, toggleable: false }
            ]
        },
        {
            code: '2', title: '2. Электрооборудование', items: [
                { code: '2.1', title: 'ЦЗ дверей', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '2.2', title: 'Стеклоподъёмники', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '2.3', title: 'Электропривод, электроскладывание зеркал', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '2.4', title: 'Звуковой сигнал', options: ['З', 'К'], hasPhoto: false, toggleable: false },
                { code: '2.5', title: 'Стеклоочистители, стеклоомыватели', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '2.6', title: 'Мультимедиа', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '2.7', title: 'Мультируль', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '2.8', title: 'Вентилятор отопителя, направление потока', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '2.9', title: 'Кондиционер', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '2.10', title: 'Регулировка руля', options: ['З', 'К'], hasPhoto: false, toggleable: true },
                { code: '2.11', title: 'Ручник', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '2.12', title: 'Функционал сидений', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '2.13', title: 'Люк, шторка', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true }
            ]
        },
        {
            code: '3', title: '3. Компьютерная диагностика', items: [
                { code: '3.1', title: 'Пробег на приборке', options: ['З', 'Ж', 'К'], hasPhoto: false, toggleable: false, onlyComment: true },
                { code: '3.2', title: 'Пробег в блоках управления / мех. одометр', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false, onlyComment: true },
                { code: '3.3', title: 'Наличие ошибок', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '3.4', title: 'Косвенные значения растяжения цепи', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '3.5', title: 'Косвенные значения остатка сцепления', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '3.6', title: 'Коррекция форсунок', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '3.7', title: 'Электронная компрессия', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true }
            ]
        },
        {
            code: '4', title: '4. Подушки безопасности', items: [
                { code: '4.1', title: 'Подушки безопасности водителя', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '4.2', title: 'Подушки безопасности пассажира', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '4.3', title: 'Пиропатроны ремней безопасности', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '4.4', title: 'Подушки в сиденьях', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '4.5', title: 'Шторки безопасности', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true }
            ]
        },
        {
            code: '5', title: '5. Течи сверху, шумы, дымность', items: [
                { code: '5.1', title: 'Уровни жидкостей', options: ['З', 'Ж', 'К'], hasPhoto: false, toggleable: false },
                { code: '5.2', title: 'Видимые течи сверху', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '5.3', title: 'Дымность', options: ['З', 'Ж', 'К'], hasPhoto: false, toggleable: false },
                { code: '5.4', title: 'Шумы ДВС, КПП и навесного оборудования', options: ['З', 'Ж', 'К'], hasPhoto: false, toggleable: false }
            ]
        },
        {
            code: '6', title: '6. Силовая часть сверху', items: [
                { code: '6.1', title: 'Общее состояние', options: ['З', 'Ж', 'К'], hasPhoto: false, toggleable: false }
            ]
        },
        {
            code: '7', title: '7. Проверки ДВС и VIN (фото вечно)', items: [
                { code: '7.1', title: 'ДВС — Свечи', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false, permanentPhoto: true },
                { code: '7.2', title: 'ДВС — Компрессия', options: ['З', 'Ж', 'К'], hasPhoto: false, toggleable: false, permanentPhoto: true },
                { code: '7.3', title: 'ДВС — Эндоскопия', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false, permanentPhoto: true },
                { code: '7.4', title: 'VIN а/м и номер ДВС', options: ['З'], hasPhoto: true, toggleable: false, permanentPhoto: true, onlyPhoto: true }
            ]
        },
        {
            code: '8', title: '8. Внешнее освещение', items: [
                { code: '8.1', title: 'Общее состояние', options: ['З', 'К'], hasPhoto: false, toggleable: false }
            ]
        },
        {
            code: '9', title: '9. Среднее положение', items: [
                { code: '9.1', title: 'Шины', options: ['З', 'Ж/К'], hasPhoto: false, toggleable: false, isPercent: true },
                { code: '9.2', title: 'Тормозные диски', options: ['З', 'Ж/К'], hasPhoto: false, toggleable: false, isPercent: true },
                { code: '9.3', title: 'Колодки', options: ['З', 'Ж/К'], hasPhoto: false, toggleable: false, isPercent: true },
                { code: '9.4', title: 'Суппорта, барабанные тормоза', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '9.5', title: 'Рулевые тяги, наконечники', options: ['З', 'К'], hasPhoto: true, toggleable: false },
                { code: '9.6', title: 'Рейка, рулевой вал', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '9.7', title: 'Опорные подшипники', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '9.8', title: 'Амортизаторы', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '9.9', title: 'Пружины', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true },
                { code: '9.10', title: 'Пневмоподвеска', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true }
            ]
        },
        {
            code: '10', title: '10. Течи снизу, масло КПП', items: [
                { code: '10.1', title: 'Наличие течей снизу', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '10.2', title: 'Осмотр масла КПП', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true }
            ]
        },
        {
            code: '11', title: '11. Силовая снизу', items: [
                { code: '11.1', title: 'Общее состояние', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false }
            ]
        },
        {
            code: '12', title: '12. Передняя подвеска, подушки ДВС и КПП', items: [
                { code: '12.1', title: 'Передняя подвеска', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false },
                { code: '12.2', title: 'Подушки ДВС и КПП', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false }
            ]
        },
        {
            code: '13', title: '13. Привода (передние, задние)', items: [
                { code: '13.1', title: 'Общее состояние', options: ['З', 'К'], hasPhoto: true, toggleable: false }
            ]
        },
        {
            code: '14', title: '14. Полный привод', items: [
                { code: '14.1', title: 'Общее состояние', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true }
            ]
        },
        {
            code: '15', title: '15. Задняя подвеска', items: [
                { code: '15.1', title: 'Общее состояние', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: false }
            ]
        },
        {
            code: '16', title: '16. Доп. проверки / информация', items: [
                { code: '16.1', title: 'Дополнительно', options: ['З', 'Ж', 'К'], hasPhoto: true, toggleable: true }
            ]
        }
    ];

    // ---------- УТИЛИТЫ ----------
    function uid() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
    function now() { return new Date().toISOString(); }
    function formatDate(iso) {
        if (!iso) return '—';
        const d = new Date(iso);
        return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) + ' ' +
               d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
    function formatDateOnly(iso) {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    }
    function daysLeft(expireIso) {
        if (!expireIso) return null;
        const ms = new Date(expireIso).getTime() - Date.now();
        if (ms <= 0) return 0;
        return Math.ceil(ms / (24 * 60 * 60 * 1000));
    }
    function photosExpired(sheet) {
        if (!sheet.finishedAt) return false;
        return Date.now() >= new Date(sheet.photosExpireAt).getTime();
    }

    // ---------- ПЕРСИСТЕНС ----------
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                state.sheets = data.sheets || [];
            }
            const sess = localStorage.getItem(SESSION_KEY);
            if (sess) state.session = JSON.parse(sess);
        } catch (e) {
            console.error('Load error', e);
        }
    }
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ sheets: state.sheets }));
        } catch (e) {
            console.error('Save error', e);
            toast('Ошибка сохранения');
        }
        if (state.session) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(state.session));
        } else {
            localStorage.removeItem(SESSION_KEY);
        }
    }

    // ---------- НАВИГАЦИЯ ----------
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(id);
        if (el) el.classList.add('active');
        window.scrollTo(0, 0);
    }

    function goToList() {
        state.currentSheetId = null;
        state.currentIterationId = null;
        renderList();
        showScreen('screen-list');
    }
    function goToCreate() {
        document.getElementById('create-make').value = '';
        document.getElementById('create-model').value = '';
        document.getElementById('create-vin').value = '';
        showScreen('screen-create');
    }

    // ---------- АВТОРИЗАЦИЯ ----------
    function login() {
        const input = document.getElementById('promo-input');
        const code = (input.value || '').trim();
        if (!code) {
            toast('Введите промокод');
            return;
        }
        if (code !== PROMO_CODE) {
            toast('Неверный промокод');
            return;
        }
        state.session = { user: 'Иванов И.И.', loginAt: now() };
        save();
        toast('Добро пожаловать!');
        input.value = '';
        // Запрос push-разрешения
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
        renderList();
        showScreen('screen-list');
    }

    // ---------- ТАБЫ ----------
    function switchTab(tab) {
        state.currentTab = tab;
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tab);
        });
        renderList();
    }

    // ---------- СПИСОК КАРТОЧЕК ----------
    function getFilteredSheets() {
        let list = state.sheets.slice();
        // Фильтр по табу
        list = list.filter(s => {
            if (state.currentTab === 'actual') {
                // Актуальные: зеленые (incoming) + желтые (done) до 7 дней
                if (s.status === 'incoming') return true;
                if (s.status === 'done') return !photosExpired(s);
                return false;
            }
            if (state.currentTab === 'history') {
                // История: желтые после 7 дней
                return s.status === 'done' && photosExpired(s);
            }
            if (state.currentTab === 'archive') {
                return s.status === 'archived';
            }
            return false;
        });
        // Поиск
        const q = (state.searchQuery || '').trim().toLowerCase();
        if (q) {
            list = list.filter(s =>
                (s.vin || '').toLowerCase().includes(q) ||
                (s.make || '').toLowerCase().includes(q) ||
                (s.model || '').toLowerCase().includes(q) ||
                (s.creator || '').toLowerCase().includes(q)
            );
        }
        // Сортировка: зеленые сверху (по дате создания desc), потом желтые (по дате завершения desc)
        list.sort((a, b) => {
            if (a.status === 'incoming' && b.status !== 'incoming') return -1;
            if (a.status !== 'incoming' && b.status === 'incoming') return 1;
            const aDate = a.status === 'incoming' ? a.createdAt : (a.finishedAt || a.createdAt);
            const bDate = b.status === 'incoming' ? b.createdAt : (b.finishedAt || b.createdAt);
            return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        return list;
    }

    function renderList() {
        const container = document.getElementById('list-content');
        if (!container) return;
        const list = getFilteredSheets();
        if (list.length === 0) {
            container.innerHTML = `
                <div class="summary-block" style="text-align:center; padding:40px 20px;">
                    <div style="font-size:48px; margin-bottom:12px;">📭</div>
                    <div style="color:var(--text-muted); font-size:14px;">Здесь пока пусто</div>
                </div>
            `;
            return;
        }
        container.innerHTML = list.map(sheet => renderCard(sheet)).join('');
    }

    function renderCard(sheet) {
        const statusClass = sheet.status === 'incoming' ? 'incoming' :
                           sheet.status === 'done' ? 'done' : 'archived';
        const statusText = sheet.status === 'incoming' ? 'Входящая' :
                          sheet.status === 'done' ? 'Завершена' : 'Архив';
        const statusIcon = sheet.status === 'incoming' ? '🟢' :
                          sheet.status === 'done' ? '🟡' : '⚪';

        // Дата для отображения
        const displayDate = sheet.status === 'incoming' ? sheet.createdAt : (sheet.finishedAt || sheet.createdAt);

        // Информация о фото
        let photoInfo = '';
        if (sheet.status === 'done' && sheet.photosExpireAt) {
            const left = daysLeft(sheet.photosExpireAt);
            if (left > 0) {
                photoInfo = `<span style="font-size:11px; color:var(--warning);">📷 фото: ${left} дн.</span>`;
            } else {
                photoInfo = `<span style="font-size:11px; color:var(--text-muted);">📷 фото удалены</span>`;
            }
        }

        // Количество выходящих
        const outgoingCount = (sheet.iterations || []).filter(i => i.kind === 'outgoing').length;
        const iterationsInfo = sheet.status !== 'incoming' && outgoingCount > 0
            ? `<span style="font-size:11px; color:var(--text-muted);">🔧 выходящих: ${outgoingCount}</span>`
            : '';

        return `
            <div class="card status-${statusClass}" onclick="App.openSheet('${sheet.id}')">
                <div class="card-header">
                    <div style="min-width:0; flex:1;">
                        <div class="card-title">${escapeHtml(sheet.make)} ${escapeHtml(sheet.model)}</div>
                        <div class="card-subtitle">VIN: ${escapeHtml(sheet.vin)}</div>
                    </div>
                    <div class="card-actions">
                        ${sheet.status === 'incoming' ? `<button class="card-action-btn" onclick="event.stopPropagation(); App.openSheet('${sheet.id}')" aria-label="Редактировать">✏️</button>` : ''}
                        <button class="card-action-btn" onclick="event.stopPropagation(); App.openPdfMenu('${sheet.id}')" aria-label="PDF">📄</button>
                    </div>
                </div>
                <div class="card-footer">
                    <div class="card-creator">👤 ${escapeHtml(sheet.creator)} · ${formatDate(displayDate)}</div>
                    <span class="badge ${statusClass}">${statusIcon} ${statusText}</span>
                </div>
                <div style="display:flex; gap:12px; flex-wrap:wrap;">
                    ${photoInfo}
                    ${iterationsInfo}
                </div>
            </div>
        `;
    }

    // ---------- СОЗДАНИЕ КАРТОЧКИ ----------
    function createSheet() {
        const employee = document.getElementById('create-employee').value;
        const make = (document.getElementById('create-make').value || '').trim();
        const model = (document.getElementById('create-model').value || '').trim();
        const vin = (document.getElementById('create-vin').value || '').trim().toUpperCase();

        if (!make || !model) {
            toast('Заполните марку и модель');
            return;
        }
        if (!vin || vin.length < 5) {
            toast('Введите VIN (минимум 5 символов)');
            return;
        }

        // Создаем карточку
        const sheetId = uid();
        const iterationId = uid();
        const createdAt = now();

        // Инициализация состояния пунктов
        const items = {};
        CHECKLIST_TEMPLATE.forEach(group => {
            group.items.forEach(item => {
                items[`${group.code}.${item.code}`] = {
                    groupCode: group.code,
                    itemCode: item.code,
                    enabled: true,
                    semaphore: item.onlyPhoto ? null : 'З',
                    semaphoreValue: null,
                    comment: '',
                    photos: []
                };
            });
        });

        const sheet = {
            id: sheetId,
            creator: employee,
            make, model, vin,
            status: 'incoming',
            createdAt,
            startedAt: createdAt,
            finishedAt: null,
            photosExpireAt: null,
            iterations: [
                {
                    id: iterationId,
                    kind: 'incoming',
                    number: 0,
                    startedAt: createdAt,
                    finishedAt: null,
                    items: items
                }
            ],
            auditLog: [
                { ts: createdAt, actor: employee, action: 'Создал карточку (Входящая)' }
            ]
        };

        state.sheets.unshift(sheet);
        save();
        toast('Карточка создана');
        state.currentSheetId = sheetId;
        state.currentIterationId = iterationId;
        openChecklist(sheetId, iterationId);
    }

    // ---------- ОТКРЫТИЕ КАРТОЧКИ ----------
    function openSheet(sheetId) {
        const sheet = state.sheets.find(s => s.id === sheetId);
        if (!sheet) return;
        state.currentSheetId = sheetId;

        if (sheet.status === 'incoming') {
            // Открываем на редактирование входящей
            const inc = sheet.iterations.find(i => i.kind === 'incoming');
            state.currentIterationId = inc.id;
            openChecklist(sheetId, inc.id);
        } else {
            // Открываем экран деталей (выбор состояния)
            renderDetails(sheet);
            showScreen('screen-details');
        }
    }

    // ---------- ДЕТАЛИ (ВЫБОР СОСТОЯНИЯ) ----------
    function renderDetails(sheet) {
        document.getElementById('details-title').textContent = `${sheet.make} ${sheet.model}`;
        document.getElementById('details-subtitle').textContent = `VIN: ${sheet.vin} · ${sheet.creator}`;

        const container = document.getElementById('details-content');
        const incoming = sheet.iterations.find(i => i.kind === 'incoming');
        const outgoing = sheet.iterations.filter(i => i.kind === 'outgoing');

        let html = '';

        // Входящая
        if (incoming) {
            const expired = photosExpired(sheet);
            const photoBadge = expired
                ? '<span style="color:var(--text-muted); font-size:11px;">📷 фото удалены (гр.7 сохранена)</span>'
                : `<span style="color:var(--warning); font-size:11px;">📷 фото доступны ${daysLeft(sheet.photosExpireAt)} дн.</span>`;
            html += `
                <div class="card" style="cursor:pointer;" onclick="App.openChecklist('${sheet.id}', '${incoming.id}', true)">
                    <div class="card-header">
                        <div>
                            <div class="card-title">🟢 Входящая диагностика</div>
                            <div class="card-subtitle">${formatDate(incoming.startedAt)} · ${incoming.finishedAt ? formatDate(incoming.finishedAt) : 'в работе'}</div>
                        </div>
                        <button class="card-action-btn" onclick="event.stopPropagation(); App.openPdf('${sheet.id}', '${incoming.id}')" aria-label="PDF">📄</button>
                    </div>
                    <div>${photoBadge}</div>
                </div>
            `;
        }

        // Выходящие
        if (outgoing.length > 0) {
            html += `<div style="font-weight:700; font-size:15px; margin:16px 0 8px; padding-left:4px;">Выходящие диагностики</div>`;
            outgoing.forEach((iter, idx) => {
                html += `
                    <div class="card" style="cursor:pointer;" onclick="App.openChecklist('${sheet.id}', '${iter.id}')">
                        <div class="card-header">
                            <div>
                                <div class="card-title">🔧 Выходящая #${idx + 1}</div>
                                <div class="card-subtitle">${formatDate(iter.startedAt)} · ${iter.finishedAt ? formatDate(iter.finishedAt) : 'в работе'}</div>
                            </div>
                            <button class="card-action-btn" onclick="event.stopPropagation(); App.openPdf('${sheet.id}', '${iter.id}')" aria-label="PDF">📄</button>
                        </div>
                    </div>
                `;
            });
        }

        // Кнопка "Новая выходящая"
        html += `
            <button class="btn btn-primary btn-block" style="margin-top:16px;" onclick="App.createOutgoing('${sheet.id}')">
                + Новая выходящая
            </button>
        `;

        container.innerHTML = html;
    }

    // ---------- СОЗДАНИЕ ВЫХОДЯЩЕЙ ----------
    function createOutgoing(sheetId) {
        const sheet = state.sheets.find(s => s.id === sheetId);
        if (!sheet) return;

        const incoming = sheet.iterations.find(i => i.kind === 'incoming');
        const outgoingCount = sheet.iterations.filter(i => i.kind === 'outgoing').length;

        // Собираем только Ж/К пункты из входящей (кумулятивно)
        const items = {};
        // Берем последнее состояние по каждому пункту
        const lastStates = {};
        sheet.iterations.forEach(iter => {
            if (iter.finishedAt || iter.kind === 'incoming') {
                Object.keys(iter.items).forEach(key => {
                    const st = iter.items[key];
                    if (st && st.semaphore && (st.semaphore === 'Ж' || st.semaphore === 'К' || st.semaphore === 'Ж/К')) {
                        lastStates[key] = { ...st };
                    } else if (st && st.semaphore === 'З') {
                        // Если стало З — удаляем из списка актуальных проблем
                        delete lastStates[key];
                    }
                });
            }
        });

        Object.keys(lastStates).forEach(key => {
            items[key] = {
                ...lastStates[key],
                semaphore: lastStates[key].semaphore,
                comment: '',
                photos: []
            };
        });

        const iterationId = uid();
        const iteration = {
            id: iterationId,
            kind: 'outgoing',
            number: outgoingCount + 1,
            startedAt: now(),
            finishedAt: null,
            items: items
        };

        sheet.iterations.push(iteration);
        sheet.auditLog.push({
            ts: now(),
            actor: state.session?.user || 'Система',
            action: `Начал выходящую #${iteration.number}`
        });
        save();
        toast('Выходящая создана');
        openChecklist(sheetId, iterationId);
    }

    // ---------- ЧЕК-ЛИСТ ----------
    function openChecklist(sheetId, iterationId, readOnly = false) {
        const sheet = state.sheets.find(s => s.id === sheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === iterationId);
        if (!iteration) return;

        state.currentSheetId = sheetId;
        state.currentIterationId = iterationId;
        state.currentReadOnly = readOnly || sheet.status === 'archived' || (sheet.status === 'done' && iteration.kind === 'incoming');

        // Заголовок
        document.getElementById('chk-title').textContent = `${sheet.make} ${sheet.model}`;
        const kindText = iteration.kind === 'incoming' ? 'Входящая' : `Выходящая #${iteration.number}`;
        const statusText = iteration.finishedAt ? `завершена ${formatDate(iteration.finishedAt)}` : 'в работе';
        document.getElementById('chk-subtitle').textContent = `${kindText} · ${sheet.creator} · ${statusText}`;

        // Bottom bar
        const bottomBar = document.getElementById('checklist-bottom-bar');
        if (state.currentReadOnly || iteration.finishedAt) {
            bottomBar.style.display = 'none';
        } else {
            bottomBar.style.display = 'flex';
        }

        renderChecklist();
        showScreen('screen-checklist');
    }

    function renderChecklist() {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === state.currentIterationId);
        if (!iteration) return;

        const container = document.getElementById('checklist-content');
        const readOnly = state.currentReadOnly;

        // Определяем, какие группы показывать
        let groupsToRender = CHECKLIST_TEMPLATE;
        if (iteration.kind === 'outgoing') {
            // В выходящей — только группы/пункты, которые есть в items
            groupsToRender = CHECKLIST_TEMPLATE.map(g => {
                const filteredItems = g.items.filter(item => iteration.items[`${g.code}.${item.code}`]);
                return { ...g, items: filteredItems };
            }).filter(g => g.items.length > 0);
        }

        if (groupsToRender.length === 0) {
            container.innerHTML = `
                <div class="summary-block" style="text-align:center; padding:40px 20px;">
                    <div style="font-size:48px; margin-bottom:12px;">✅</div>
                    <div style="color:var(--text-muted); font-size:14px;">Нет проблемных пунктов из входящей</div>
                </div>
            `;
            return;
        }

        let html = '';
        groupsToRender.forEach(group => {
            const isPermanent = PERMANENT_GROUPS.includes(group.code);
            const groupTitle = group.title + (isPermanent ? '' : '');
            html += `
                <div class="group" data-group="${group.code}">
                    <div class="group-header" onclick="App.toggleGroup('${group.code}')">
                        <span>${groupTitle}</span>
                        <span class="chevron">▼</span>
                    </div>
                    <div class="group-content">
            `;
            group.items.forEach(item => {
                const key = `${group.code}.${item.code}`;
                const st = iteration.items[key] || { enabled: true, semaphore: 'З', comment: '', photos: [] };
                html += renderItem(group, item, st, iteration, readOnly);
            });
            html += `</div></div>`;
        });

        // Summary блоки (только для входящей или завершенной)
        if (iteration.kind === 'incoming' || iteration.finishedAt) {
            const summary = buildSummary(iteration);
            html += renderSummary(summary);
        }

        container.innerHTML = html;
    }

    function renderItem(group, item, st, iteration, readOnly) {
        const key = `${group.code}.${item.code}`;
        const disabled = item.toggleable && !st.enabled;
        const options = item.options;

        // Бейдж
        let badgeClass = 'badge-N';
        let badgeText = '—';
        if (st.semaphore === 'З') { badgeClass = 'badge-Z'; badgeText = 'З'; }
        else if (st.semaphore === 'Ж') { badgeClass = 'badge-G'; badgeText = 'Ж'; }
        else if (st.semaphore === 'К') { badgeClass = 'badge-R'; badgeText = 'К'; }
        else if (st.semaphore === 'Ж/К') { badgeClass = 'badge-GR'; badgeText = 'Ж/К'; }

        // Выходящая — показываем "было -> стало"
        let transitionHtml = '';
        if (iteration.kind === 'outgoing') {
            // Находим предыдущее состояние
            const prevSem = findPreviousSemaphore(st, iteration);
            if (prevSem && prevSem !== st.semaphore) {
                transitionHtml = `
                    <div class="semaphore-transition">
                        <span>${prevSem}</span>
                        <span class="semaphore-arrow">→</span>
                        <span style="color:var(--${st.semaphore === 'З' ? 'success' : st.semaphore === 'К' ? 'danger' : 'warning'});">${st.semaphore}</span>
                    </div>
                `;
            }
        }

        // Семафоры
        let semHtml = '';
        if (!item.onlyPhoto && !readOnly) {
            semHtml = `<div class="semaphore-group">`;
            options.forEach(opt => {
                const active = st.semaphore === opt ? 'active ' + (opt === 'З' ? 'Z' : opt === 'Ж' ? 'G' : opt === 'К' ? 'R' : 'G') : '';
                const label = opt === 'З' ? '🟢 З' : opt === 'Ж' ? '🟡 Ж' : opt === 'К' ? '🔴 К' : '🟡/🔴 Ж/К';
                semHtml += `<button class="semaphore-btn ${active}" onclick="App.setSemaphore('${key}', '${opt}')">${label}</button>`;
            });
            semHtml += `</div>`;

            // Для Ж/К — поле процента
            if (item.isPercent && st.semaphore === 'Ж/К') {
                semHtml += `
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span style="font-size:12px; color:var(--text-muted);">Износ %:</span>
                        <input type="number" min="0" max="100" value="${st.semaphoreValue || ''}" 
                               onchange="App.setPercent('${key}', this.value)"
                               style="width:80px; padding:8px; border-radius:8px; border:0.5px solid var(--border); font-size:14px;">
                    </div>
                `;
            }
        } else if (readOnly && !item.onlyPhoto) {
            semHtml = `<div class="semaphore-transition"><span>Текущий:</span><span class="item-badge ${badgeClass}">${badgeText}</span></div>`;
        }

        // Комментарий
        let commentHtml = '';
        if (!item.onlyPhoto) {
            if (readOnly) {
                if (st.comment) {
                    commentHtml = `<div style="font-size:13px; padding:10px 12px; background:rgba(142,142,147,0.08); border-radius:8px;">💬 ${escapeHtml(st.comment)}</div>`;
                }
            } else {
                commentHtml = `<textarea class="comment-input" placeholder="Комментарий..." onchange="App.setComment('${key}', this.value)">${escapeHtml(st.comment || '')}</textarea>`;
            }
        }

        // Фото (только входящая, не выходящая)
        let photoHtml = '';
        if (item.hasPhoto && iteration.kind === 'incoming') {
            const permanent = item.permanentPhoto || PERMANENT_GROUPS.includes(group.code);
            const photos = st.photos || [];
            if (readOnly) {
                if (photos.length > 0) {
                    photoHtml = `<div class="photo-row">${photos.map(p => `<div class="photo-preview">${escapeHtml(p.name || 'фото')}${permanent ? '<span class="photo-permanent">∞</span>' : ''}</div>`).join('')}</div>`;
                }
            } else {
                photoHtml = `<div class="photo-row">`;
                photos.forEach((p, idx) => {
                    photoHtml += `
                        <div class="photo-preview">
                            ${escapeHtml(p.name || 'фото')}
                            ${permanent ? '<span class="photo-permanent">∞</span>' : ''}
                            <span class="photo-del" onclick="App.removePhoto('${key}', ${idx})">×</span>
                        </div>
                    `;
                });
                photoHtml += `<div class="photo-btn" onclick="App.addPhoto('${key}')">+</div>`;
                photoHtml += `</div>`;
            }
        }

        // Тумблер (•)
        let toggleHtml = '';
        if (item.toggleable) {
            if (!readOnly) {
                toggleHtml = `
                    <div class="toggle-wrap">
                        <span>Не применимо к этому авто</span>
                        <div class="toggle ${st.enabled ? 'active' : ''}" onclick="App.toggleItem('${key}')"></div>
                    </div>
                `;
            }
        }

        return `
            <div class="item ${disabled ? 'disabled' : ''}" data-item="${key}">
                <div class="item-header" onclick="App.toggleItemOpen('${key}')">
                    <div class="item-title">
                        ${escapeHtml(item.title)}
                        ${item.toggleable ? ' <span style="font-size:11px; color:var(--text-muted);">(•)</span>' : ''}
                        <span class="item-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <span class="chevron" style="font-size:12px; color:var(--text-muted); transition:transform 0.3s;">▼</span>
                </div>
                <div class="item-content">
                    ${transitionHtml}
                    ${toggleHtml}
                    ${semHtml}
                    ${commentHtml}
                    ${photoHtml}
                </div>
            </div>
        `;
    }

    function findPreviousSemaphore(currentState, currentIteration) {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return null;
        // Ищем во всех итерациях до текущей
        const idx = sheet.iterations.findIndex(i => i.id === currentIteration.id);
        if (idx <= 0) return null;
        // Берем состояние из предыдущей итерации
        const prev = sheet.iterations[idx - 1];
        const key = `${currentState.groupCode}.${currentState.itemCode}`;
        if (prev.items[key]) return prev.items[key].semaphore;
        return null;
    }

    function buildSummary(iteration) {
        const critical = [];
        const recommend = [];
        Object.keys(iteration.items).forEach(key => {
            const st = iteration.items[key];
            if (!st.enabled) return;
            if (st.semaphore === 'К') critical.push(st);
            else if (st.semaphore === 'Ж') recommend.push(st);
            else if (st.semaphore === 'Ж/К') {
                const v = parseFloat(st.semaphoreValue) || 0;
                if (v >= 80) critical.push(st);
                else recommend.push(st);
            }
        });
        return { critical, recommend };
    }

    function renderSummary(summary) {
        const cCount = summary.critical.length;
        const rCount = summary.recommend.length;
        return `
            <div class="summary-block">
                <h3>🔴 Критические к устранению <span class="count">${cCount}</span></h3>
                ${cCount === 0 ? '<div class="summary-empty">Нет</div>' : summary.critical.map(st => `<div class="summary-item">${escapeHtml(st.itemCode)} — ${escapeHtml(st.comment || 'критично')}</div>`).join('')}
            </div>
            <div class="summary-block">
                <h3>🟡 Рекомендуемые к устранению <span class="count">${rCount}</span></h3>
                ${rCount === 0 ? '<div class="summary-empty">Нет</div>' : summary.recommend.map(st => `<div class="summary-item">${escapeHtml(st.itemCode)} — ${escapeHtml(st.comment || 'рекомендовано')}</div>`).join('')}
            </div>
        `;
    }

    // ---------- ВЗАИМОДЕЙСТВИЕ С ЧЕК-ЛИСТОМ ----------
    function toggleGroup(code) {
        const el = document.querySelector(`.group[data-group="${code}"]`);
        if (el) el.classList.toggle('open');
    }

    function toggleItemOpen(key) {
        const el = document.querySelector(`.item[data-item="${key}"]`);
        if (el) el.classList.toggle('open');
    }

    function toggleItem(key) {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === state.currentIterationId);
        if (!iteration) return;
        const st = iteration.items[key];
        if (!st) return;
        st.enabled = !st.enabled;
        logChange(sheet, `Пункт ${key}: ${st.enabled ? 'включен' : 'выключен'} (•)`);
        save();
        renderChecklist();
    }

    function setSemaphore(key, val) {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === state.currentIterationId);
        if (!iteration) return;
        const st = iteration.items[key];
        if (!st) return;
        const old = st.semaphore;
        st.semaphore = val;
        logChange(sheet, `Пункт ${key}: ${old || '—'} → ${val}`);
        save();
        renderChecklist();
    }

    function setPercent(key, val) {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === state.currentIterationId);
        if (!iteration) return;
        const st = iteration.items[key];
        if (!st) return;
        st.semaphoreValue = parseFloat(val) || 0;
        // Пересчет: <80 → Ж, >=80 → К
        st.semaphore = st.semaphoreValue >= 80 ? 'К' : 'Ж';
        save();
        renderChecklist();
    }

    function setComment(key, val) {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === state.currentIterationId);
        if (!iteration) return;
        const st = iteration.items[key];
        if (!st) return;
        st.comment = val;
        save();
    }

    function addPhoto(key) {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === state.currentIterationId);
        if (!iteration) return;
        const st = iteration.items[key];
        if (!st) return;
        st.photos = st.photos || [];
        st.photos.push({ name: 'фото ' + (st.photos.length + 1) });
        logChange(sheet, `Пункт ${key}: + фото`);
        save();
        renderChecklist();
    }

    function removePhoto(key, idx) {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === state.currentIterationId);
        if (!iteration) return;
        const st = iteration.items[key];
        if (!st || !st.photos) return;
        st.photos.splice(idx, 1);
        logChange(sheet, `Пункт ${key}: - фото`);
        save();
        renderChecklist();
    }

    // ---------- ЗАВЕРШЕНИЕ ИТЕРАЦИИ ----------
    function finishIteration() {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === state.currentIterationId);
        if (!iteration) return;

        iteration.finishedAt = now();
        logChange(sheet, `Завершил ${iteration.kind === 'incoming' ? 'входящую' : 'выходящую #' + iteration.number}`);

        if (iteration.kind === 'incoming') {
            sheet.status = 'done';
            sheet.finishedAt = iteration.finishedAt;
            sheet.photosExpireAt = new Date(Date.now() + PHOTOS_TTL_MS).toISOString();
        }

        save();
        toast('Итерация завершена');

        // Возврат на список или детали
        if (sheet.status === 'incoming') {
            goToList();
        } else {
            renderDetails(sheet);
            showScreen('screen-details');
        }
    }

    function goBackFromChecklist() {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (sheet && sheet.status !== 'incoming') {
            renderDetails(sheet);
            showScreen('screen-details');
        } else {
            goToList();
        }
    }

    // ---------- АУДИТ-ЛОГ ----------
    function logChange(sheet, action) {
        sheet.auditLog = sheet.auditLog || [];
        sheet.auditLog.push({
            ts: now(),
            actor: state.session?.user || 'Система',
            action
        });
    }

    function showAudit() {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (!sheet) {
            toast('Сначала откройте карточку');
            return;
        }
        document.getElementById('audit-subtitle').textContent = `${sheet.make} ${sheet.model} · ${sheet.vin}`;
        const container = document.getElementById('audit-content');
        const log = (sheet.auditLog || []).slice().reverse();
        if (log.length === 0) {
            container.innerHTML = '<div class="summary-block" style="text-align:center; padding:40px;">Пусто</div>';
        } else {
            container.innerHTML = log.map(entry => `
                <div class="card" style="cursor:default;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span style="font-weight:600; font-size:13px;">${escapeHtml(entry.actor)}</span>
                        <span style="font-size:12px; color:var(--text-muted);">${formatDate(entry.ts)}</span>
                    </div>
                    <div style="font-size:14px; color:var(--text-secondary);">${escapeHtml(entry.action)}</div>
                </div>
            `).join('');
        }
        showScreen('screen-audit');
    }

    function goBackFromAudit() {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (sheet) {
            if (sheet.status === 'incoming') openChecklist(sheet.id, state.currentIterationId);
            else {
                renderDetails(sheet);
                showScreen('screen-details');
            }
        } else goToList();
    }

    // ---------- PDF ----------
    function openPdfMenu(sheetId) {
        const sheet = state.sheets.find(s => s.id === sheetId);
        if (!sheet) return;
        const content = document.getElementById('modal-content');
        let html = `<h3>Скачать PDF</h3><p>Выберите состояние:</p><div class="modal-actions">`;
        sheet.iterations.forEach(iter => {
            if (iter.kind === 'incoming') {
                html += `<button class="btn btn-secondary" onclick="App.openPdf('${sheet.id}', '${iter.id}'); App.closeModal();">🟢 Входящая диагностика</button>`;
            } else {
                html += `<button class="btn btn-secondary" onclick="App.openPdf('${sheet.id}', '${iter.id}'); App.closeModal();">🔧 Выходящая #${iter.number}</button>`;
            }
        });
        html += `<button class="btn btn-secondary" onclick="App.closeModal()" style="margin-top:8px;">Отмена</button></div>`;
        content.innerHTML = html;
        document.getElementById('modal').classList.add('open');
    }

    function openPdf(sheetId, iterationId) {
        const sheet = state.sheets.find(s => s.id === sheetId);
        if (!sheet) return;
        const iteration = sheet.iterations.find(i => i.id === iterationId);
        if (!iteration) return;

        const expired = photosExpired(sheet);
        document.getElementById('pdf-subtitle').textContent =
            `${sheet.make} ${sheet.model} · ${iteration.kind === 'incoming' ? 'Входящая' : 'Выходящая #' + iteration.number}`;

        const container = document.getElementById('pdf-content');
        let html = `
            <h1>${escapeHtml(sheet.make)} ${escapeHtml(sheet.model)}</h1>
            <div class="pdf-meta">
                VIN: ${escapeHtml(sheet.vin)}<br>
                Создатель: ${escapeHtml(sheet.creator)}<br>
                ${iteration.kind === 'incoming' ? 'Входящая' : 'Выходящая #' + iteration.number} · ${formatDate(iteration.startedAt)}${iteration.finishedAt ? ' — ' + formatDate(iteration.finishedAt) : ''}
            </div>
        `;

        // Группы
        CHECKLIST_TEMPLATE.forEach(group => {
            const itemsToShow = group.items.filter(item => {
                const key = `${group.code}.${item.code}`;
                return iteration.items[key] && iteration.items[key].enabled !== false;
            });
            if (itemsToShow.length === 0) return;
            // Для выходящей — показываем только те, что есть в items (уже отфильтровано)
            if (iteration.kind === 'outgoing' && !itemsToShow.some(item => iteration.items[`${group.code}.${item.code}`])) return;

            html += `<h2>${escapeHtml(group.title)}</h2>`;
            itemsToShow.forEach(item => {
                const key = `${group.code}.${item.code}`;
                const st = iteration.items[key];
                if (!st) return;

                // Фото: в входящей — если не истекли, или это группа 7 (вечные). В выходящей — нет
                let photosText = '';
                if (iteration.kind === 'incoming' && item.hasPhoto && st.photos && st.photos.length > 0) {
                    const permanent = item.permanentPhoto || PERMANENT_GROUPS.includes(group.code);
                    if (permanent || !expired) {
                        photosText = ` <span style="color:#8e8e93; font-size:11px;">[фото: ${st.photos.length}]</span>`;
                    }
                }

                const sem = st.semaphore || '—';
                const semClass = sem === 'З' ? 'Z' : sem === 'Ж' ? 'G' : sem === 'К' ? 'R' : 'G';
                html += `
                    <div class="pdf-item">
                        <span class="pdf-sem ${semClass}">${sem}</span> 
                        <strong>${escapeHtml(item.title)}</strong>
                        ${st.comment ? `<br><span style="color:#3a3a3c;">💬 ${escapeHtml(st.comment)}</span>` : ''}
                        ${photosText}
                    </div>
                `;
            });
        });

        // Summary
        const summary = buildSummary(iteration);
        html += `
            <div class="pdf-summary">
                <h3>🔴 Критические к устранению (${summary.critical.length})</h3>
                ${summary.critical.length === 0 ? '<p style="color:#8e8e93;">Нет</p>' : summary.critical.map(st => `<div>• ${escapeHtml(st.itemCode)} — ${escapeHtml(st.comment || 'критично')}</div>`).join('')}
            </div>
            <div class="pdf-summary">
                <h3>🟡 Рекомендуемые к устранению (${summary.recommend.length})</h3>
                ${summary.recommend.length === 0 ? '<p style="color:#8e8e93;">Нет</p>' : summary.recommend.map(st => `<div>• ${escapeHtml(st.itemCode)} — ${escapeHtml(st.comment || 'рекомендовано')}</div>`).join('')}
            </div>
        `;

        container.innerHTML = html;
        showScreen('screen-pdf');
    }

    function printPdf() {
        window.print();
    }

    function goBackFromPdf() {
        const sheet = state.sheets.find(s => s.id === state.currentSheetId);
        if (sheet) {
            if (sheet.status === 'incoming') openChecklist(sheet.id, state.currentIterationId);
            else {
                renderDetails(sheet);
                showScreen('screen-details');
            }
        } else goToList();
    }

    // ---------- ДЕБАГ-ПАНЕЛЬ ----------
    function toggleDebug() {
        const menu = document.getElementById('debug-menu');
        menu.classList.toggle('open');
    }

    function simulateCron() {
        // Переводим все завершенные входящие старше 7 дней в "Историю" (фактически фото удаляются, статус done остается)
        let count = 0;
        state.sheets.forEach(sheet => {
            if (sheet.status === 'done' && sheet.photosExpireAt) {
                // Удаляем все фото, кроме группы 7
                sheet.iterations.forEach(iter => {
                    if (iter.kind === 'incoming') {
                        Object.keys(iter.items).forEach(key => {
                            const st = iter.items[key];
                            const groupCode = key.split('.')[0];
                            const isPermanent = PERMANENT_GROUPS.includes(groupCode);
                            if (st.photos && st.photos.length > 0 && !isPermanent) {
                                st.photos = [];
                                count++;
                            }
                        });
                    }
                });
                sheet.auditLog.push({
                    ts: now(),
                    actor: 'Система (CRON)',
                    action: 'Фото удалены (7 дней истекли), кроме гр.7'
                });
            }
        });
        save();
        toast(count > 0 ? `Фото удалены: ${count} пунктов` : 'Нечего удалять');
        renderList();
    }

    function demoPush() {
        if (!('Notification' in window)) {
            toast('Уведомления не поддерживаются');
            return;
        }
        if (Notification.permission === 'granted') {
            new Notification('Диагностика', {
                body: 'Демо-уведомление: карточка готова к выходящей диагностике',
                icon: 'icons/icon-192.png'
            });
            toast('Уведомление отправлено');
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(perm => {
                if (perm === 'granted') demoPush();
            });
        } else {
            toast('Уведомления запрещены');
        }
    }

    function resetData() {
        if (!confirm('Сбросить все данные? Это удалит все карточки.')) return;
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SESSION_KEY);
        state.sheets = [];
        state.session = null;
        state.currentSheetId = null;
        state.currentIterationId = null;
        toast('Данные сброшены');
        showScreen('screen-auth');
    }

    // ---------- МОДАЛЬНОЕ ОКНО ----------
    function closeModal(e) {
        if (e && e.target !== e.currentTarget) return;
        document.getElementById('modal').classList.remove('open');
    }

    // ---------- ТОСТ ----------
    let toastTimer = null;
    function toast(msg) {
        const t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
    }

    // ---------- ЭКРАНИРОВАНИЕ HTML ----------
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ---------- ИНИЦИАЛИЗАЦИЯ ----------
    function init() {
        load();

        // Поиск
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                state.searchQuery = e.target.value;
                renderList();
            });
        }

        // Онлайн/оффлайн
        function updateNetStatus() {
            const el = document.getElementById('net-status');
            if (!el) return;
            if (navigator.onLine) {
                el.innerHTML = '<div class="dot"></div> <span>Online</span>';
                el.classList.remove('offline');
            } else {
                el.innerHTML = '<div class="dot"></div> <span>Offline</span>';
                el.classList.add('offline');
            }
        }
        window.addEventListener('online', () => { updateNetStatus(); toast('Соединение восстановлено'); });
        window.addEventListener('offline', () => { updateNetStatus(); toast('Нет сети. Работаем оффлайн'); });
        updateNetStatus();

        // Регистрация Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW reg fail', err));
        }

        // Если есть сессия — сразу в список
        if (state.session) {
            renderList();
            showScreen('screen-list');
        } else {
            showScreen('screen-auth');
        }
    }

    // ---------- ПУБЛИЧНЫЙ API ----------
    return {
        init,
        login,
        goToList,
        goToCreate,
        switchTab,
        createSheet,
        openSheet,
        openChecklist,
        toggleGroup,
        toggleItemOpen,
        toggleItem,
        setSemaphore,
        setPercent,
        setComment,
        addPhoto,
        removePhoto,
        finishIteration,
        goBackFromChecklist,
        showAudit,
        goBackFromAudit,
        openPdfMenu,
        openPdf,
        printPdf,
        goBackFromPdf,
        createOutgoing,
        toggleDebug,
        simulateCron,
        demoPush,
        resetData,
        closeModal
    };
})();

// Запуск после загрузки DOM
document.addEventListener('DOMContentLoaded', () => App.init());