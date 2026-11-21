(() => {
    'use strict';

    // Extracted from additionCardsWidget and buildWidget. Lessons retain their
    // questions and marking; this part owns slots, the tray and input handling.
    function element(tag, text = '', className = '') {
        const node = document.createElement(tag);
        node.textContent = text;
        node.className = className;
        return node;
    }

    function columnTable({ columns, rows, label, className = '', cellExtra }) {
        const table = element('table', '', `digit-column-table ${className}`);
        table.setAttribute('aria-label', label || 'Place-value columns');
        const head = element('thead'), headings = element('tr');
        headings.append(element('td', '', 'digit-column-table__gutter'));
        columns.forEach(column => {
            const cell = element('th', column.label);
            cell.scope = 'col';
            cell.dataset.column = column.id;
            headings.append(cell);
        });
        head.append(headings);
        const body = element('tbody'), cells = {}, rowNodes = {}, slots = [];
        rows.forEach(row => {
            const node = element('tr', '', row.className || '');
            node.classList.toggle('is-answer', Boolean(row.answer));
            node.classList.toggle('is-faded', Boolean(row.faded));
            node.classList.toggle('is-blue', Boolean(row.highlighted));
            const gutter = element('td', '', 'digit-column-table__gutter');
            if (row.sign) gutter.append(element('span', row.sign, 'digit-column-table__sign'));
            node.append(gutter);
            cells[row.id] = {};
            rowNodes[row.id] = node;
            columns.forEach(column => {
                const cell = element('td');
                cell.dataset.column = column.id;
                const field = row.values?.[column.id];
                if (field && typeof field === 'object' && field.slot) {
                    const button = element('button', '', 'digit-card-slot');
                    button.type = 'button';
                    button.setAttribute('aria-label', field.label || `${row.id}, ${column.label}`);
                    button.dataset.slot = field.slot;
                    cell.append(button);
                    slots.push({ id: field.slot, element: button, column: column.id, group: row.id, allowed: field.allowed });
                } else {
                    cell.append(element('span', field ?? '', 'digit-column-table__digit'));
                }
                cells[row.id][column.id] = cell;
                // Extras are supplied while drawing, never inserted by a DOM patch.
                cellExtra?.(cell, { row, column });
                node.append(cell);
            });
            body.append(node);
        });
        table.append(head, body);
        return {
            table, cells, rows: rowNodes, slots,
            update({ activeColumn = null, faded = {}, highlighted = {} } = {}) {
                Object.entries(rowNodes).forEach(([id, row]) => {
                    if (id in faded) row.classList.toggle('is-faded', faded[id]);
                    if (id in highlighted) row.classList.toggle('is-blue', highlighted[id]);
                    Object.entries(cells[id]).forEach(([key, cell]) => {
                        cell.classList.toggle('is-active-column', key === activeColumn && !row.classList.contains('is-faded'));
                    });
                });
                [...headings.children].forEach(cell => cell.classList.toggle('is-active-column', cell.dataset.column === activeColumn));
            }
        };
    }

    function create(host, { slots, groups = {}, value: initialValue = null, active: initialActive = null,
        editable: initialEditable = true, onChange = () => {}, onPaint = () => {}, disabledDigits = [] } = {}) {
        let value = initialValue, editable = initialEditable, phase = 'answer', drag = null;
        let suppressClick = false;
        const flights = new Set();
        const tray = element('div', '', 'digit-card-tray');
        tray.setAttribute('role', 'group');
        tray.setAttribute('aria-label', 'Number cards');
        const byId = new Map(slots.map(slot => [slot.id, slot]));
        const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const allowed = slot => editable && (!slot.allowed || slot.allowed(value));
        const current = () => value?.active ?? (value ? null : initialActive);
        const cards = Array.from({ length: 10 }, (_, digit) => {
            const card = element('button', String(digit), 'digit-card');
            card.type = 'button';
            card.setAttribute('aria-label', `Digit ${digit}`);
            card.addEventListener('click', event => {
                if (suppressClick) { event.preventDefault(); suppressClick = false; return; }
                place(String(digit), current(), card);
            });
            card.addEventListener('pointerdown', event => startDrag(event, card, String(digit)));
            tray.append(card);
            return card;
        });
        host.append(tray);

        slots.forEach(slot => {
            slot.element.classList.add('digit-card-slot');
            slot.element.dataset.slot = slot.id;
            slot.element.addEventListener('click', () => {
                if (!allowed(slot)) return;
                value = { digits: { ...value?.digits }, active: slot.id };
                save();
            });
        });
        function paint() {
            const active = current(), digits = value?.digits || {};
            slots.forEach(slot => {
                const button = slot.element, selected = allowed(slot) && active === slot.id;
                button.textContent = digits[slot.id] ?? '';
                button.disabled = !allowed(slot);
                button.classList.toggle('is-highlighted', selected);
                button.classList.toggle('is-filled', digits[slot.id] !== undefined);
                button.setAttribute('aria-pressed', String(selected));
            });
            cards.forEach((card, digit) => {
                // A card can still be dragged when no slot has been selected.
                card.disabled = !editable || disabledDigits.includes(String(digit)) || !slots.some(allowed);
            });
            onPaint({ value, active, editable, phase });
        }
        function save() {
            onChange({ digits: { ...value.digits }, active: value.active });
            paint();
        }
        function nextSlot(id, digits) {
            const slot = byId.get(id), group = groups[slot.group] || {};
            if (!group.advance || group.advance === 'none') return id;
            const ordered = slots.filter(candidate => candidate.group === slot.group);
            if (group.advance === 'left') ordered.reverse();
            const index = ordered.indexOf(slot);
            return [...ordered.slice(index + 1), ...ordered.slice(0, index)].find(candidate =>
                allowed(candidate) && digits[candidate.id] === undefined)?.id || null;
        }
        function ghost(card) {
            const box = card.getBoundingClientRect();
            const node = element('span', card.textContent, 'digit-card digit-card-flight');
            node.setAttribute('aria-hidden', 'true');
            Object.assign(node.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
            document.body.append(node);
            flights.add(node);
            return { node, box };
        }
        function removeFlight(node) { node.remove(); flights.delete(node); }
        function fly(node, from, to, finish = () => {}) {
            if (reduced()) { removeFlight(node); finish(); return; }
            const animation = node.animate([
                { transform: `translate(${from.x}px, ${from.y}px)` },
                { transform: `translate(${to.x}px, ${to.y}px)` }
            ], { duration: 200, easing: 'ease-out', fill: 'forwards' });
            animation.finished.catch(() => {}).then(() => { removeFlight(node); finish(); });
        }
        function place(digit, id, source, flying = null) {
            const slot = byId.get(id);
            if (!slot || !allowed(slot)) return false;
            const flight = flying || (!reduced() && source ? ghost(source) : null);
            const digits = { ...value?.digits, [id]: digit };
            value = { digits, active: id };
            value.active = nextSlot(id, digits);
            save();
            if (flight) {
                const target = slot.element.getBoundingClientRect();
                slot.element.classList.add('is-arriving');
                fly(flight.node, flight.offset || { x: 0, y: 0 }, {
                    x: target.left + target.width / 2 - flight.box.left - flight.box.width / 2,
                    y: target.top + target.height / 2 - flight.box.top - flight.box.height / 2
                }, () => slot.element.classList.remove('is-arriving'));
            }
            return true;
        }
        function targetAt(x, y) {
            const target = document.elementFromPoint(x, y);
            return slots.find(slot => allowed(slot) && (slot.element === target || slot.element.contains(target)));
        }
        function clearDropTargets() { slots.forEach(slot => slot.element.classList.remove('is-drop-target')); }
        function startDrag(event, card, digit) {
            if (!editable || card.disabled || event.button !== 0 || drag) return;
            const start = { x: event.clientX, y: event.clientY };
            drag = { card, digit, pointer: event.pointerId, start, flight: null };
            card.setPointerCapture(event.pointerId);
        }
        function moveDrag(event) {
            if (!drag || drag.pointer !== event.pointerId) return;
            const x = event.clientX - drag.start.x, y = event.clientY - drag.start.y;
            if (!drag.flight && Math.hypot(x, y) < 6) return;
            event.preventDefault();
            drag.flight ||= ghost(drag.card);
            drag.flight.offset = { x, y };
            drag.flight.node.style.transform = `translate(${x}px, ${y}px)`;
            clearDropTargets();
            targetAt(event.clientX, event.clientY)?.element.classList.add('is-drop-target');
        }
        function endDrag(event) {
            if (!drag || drag.pointer !== event.pointerId) return;
            const previous = drag;
            drag = null;
            clearDropTargets();
            if (previous.card.hasPointerCapture(event.pointerId)) previous.card.releasePointerCapture(event.pointerId);
            if (!previous.flight) return;
            suppressClick = true;
            // Clear suppression after the synthetic click, even if the browser
            // omits that click following cancellation or a touch drag.
            setTimeout(() => { suppressClick = false; }, 0);
            const slot = event.type === 'pointerup' && targetAt(event.clientX, event.clientY);
            if (!slot || !place(previous.digit, slot.id, previous.card, previous.flight)) {
                fly(previous.flight.node, previous.flight.offset, { x: 0, y: 0 });
            }
        }
        tray.addEventListener('pointermove', moveDrag);
        tray.addEventListener('pointerup', endDrag);
        tray.addEventListener('pointercancel', endDrag);
        tray.addEventListener('lostpointercapture', endDrag);
        function keydown(event) {
            if (!editable || event.ctrlKey || event.metaKey || event.altKey) return;
            if (/^[0-9]$/.test(event.key) && !disabledDigits.includes(event.key)) {
                if (place(event.key, current(), null)) event.preventDefault();
            } else if (['Backspace', 'Delete'].includes(event.key) && byId.has(current()) && allowed(byId.get(current()))) {
                event.preventDefault();
                const digits = { ...value?.digits };
                delete digits[current()];
                value = { digits, active: current() };
                save();
            }
        }
        host.addEventListener('keydown', keydown);
        paint();
        return {
            update(next) {
                if (drag) endDrag({ type: 'pointercancel', pointerId: drag.pointer });
                flights.forEach(removeFlight);
                slots.forEach(slot => slot.element.classList.remove('is-arriving'));
                value = next.value ? JSON.parse(JSON.stringify(next.value)) : null;
                editable = next.editable;
                phase = next.phase;
                paint();
            },
            focus() { (byId.get(current()) || slots.find(allowed))?.element.focus(); },
            destroy() {
                if (drag) endDrag({ type: 'pointercancel', pointerId: drag.pointer });
                flights.forEach(removeFlight);
                host.removeEventListener('keydown', keydown);
                tray.remove();
            }
        };
    }
    window.Maths1to9DigitCards = { create, columnTable };
})();
