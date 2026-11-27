// T033: the "Whose place is this?" field (R3.1 to R3.4, R3.6, R3.8).
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Person } from '../../db/people';
import { initI18n } from '../../i18n';
import { ContactPicker } from './ContactPicker';
import type { DeviceContact } from './types';

const person = (id: string, name: string, contactRef: string | null = null): Person => ({
  id,
  name,
  phone: null,
  contactRef,
  photoUri: null,
  createdAt: 1,
  updatedAt: 1,
});

const ahmed = person('p1', 'Ahmed Sample', 'c-1');
const people = [ahmed, person('p2', 'Bilal Sample')];
const contacts: DeviceContact[] = [
  { contactRef: 'c-1', name: 'Ahmed Sample', phone: '0300 0000000', photoUri: null },
  { contactRef: 'c-2', name: 'Ahmed Bhai (Plumber)', phone: '0300 0000001', photoUri: 'content://photo/2' },
];

function setup(overrides: Partial<Parameters<typeof ContactPicker>[0]> = {}) {
  const onChange = jest.fn();
  const onAllowContacts = jest.fn();
  const view = render(
    <ContactPicker
      text=""
      choice={{ kind: 'none' }}
      recent={[]}
      people={people}
      contacts={contacts}
      access="all"
      savedLabels={{ p1: ['Home'] }}
      onChange={onChange}
      onAllowContacts={onAllowContacts}
      {...overrides}
    />,
  );
  return { view, onChange, onAllowContacts };
}

describe('ContactPicker', () => {
  beforeAll(async () => {
    await initI18n('en');
  });

  it('suggests the recently used people before anything is typed (R3.3)', async () => {
    const { view, onChange } = setup({ recent: people });
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Choose Bilal Sample' }));
    expect(onChange).toHaveBeenCalledWith('Bilal Sample', { kind: 'existing', personId: 'p2' });
  });

  it('shows matching people and contacts with name and photo as the user types (R3.2)', async () => {
    await setup({ text: 'Ahm', choice: { kind: 'new', name: 'Ahm' } }).view;
    expect(screen.getByText('Ahmed Sample')).toBeTruthy();
    expect(screen.getByText('From contacts · already has Home saved')).toBeTruthy();
    expect(screen.getByText('Ahmed Bhai (Plumber)')).toBeTruthy();
    // The image component may hand its source on as a list.
    const photo = screen.getByTestId('contact-photo', { includeHiddenElements: true });
    expect([photo.props.source].flat()).toEqual([{ uri: 'content://photo/2' }]);
    expect(screen.queryByText('Bilal Sample')).toBeNull();
  });

  it('picks a device contact with only its name, phone, and photo reference (R3.6)', async () => {
    const { view, onChange } = setup({ text: 'Ahm', choice: { kind: 'new', name: 'Ahm' } });
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Choose Ahmed Bhai (Plumber)' }));
    expect(onChange).toHaveBeenCalledWith('Ahmed Bhai (Plumber)', { kind: 'contact', contact: contacts[1] });
    expect(Object.keys(contacts[1]).sort()).toEqual(['contactRef', 'name', 'phone', 'photoUri']);
  });

  it('marks the picked row', async () => {
    await setup({ text: 'Ahmed Sample', choice: { kind: 'existing', personId: 'p1' } }).view;
    expect(screen.getByRole('button', { name: 'Choose Ahmed Sample' })).toBeSelected();
  });

  it('treats typed text as a new person, and no text as no person (R3.4, R3.8, R3.11)', async () => {
    const { view, onChange } = setup();
    await view;
    const field = screen.getByLabelText('Whose place is this?');
    await fireEvent.changeText(field, ' Sara ');
    expect(onChange).toHaveBeenLastCalledWith(' Sara ', { kind: 'new', name: 'Sara' });
    await fireEvent.changeText(field, '  ');
    expect(onChange).toHaveBeenLastCalledWith('  ', { kind: 'none' });
    expect(field.props.maxLength).toBe(100);
  });

  it('asks for contacts with a one-line reason the first time the field is used (R3.1)', async () => {
    const { view, onAllowContacts } = setup({ access: 'not_asked', contacts: [] });
    await view;
    expect(screen.queryByText(/never uploaded/)).toBeNull();
    await fireEvent(screen.getByLabelText('Whose place is this?'), 'focus');
    expect(
      screen.getByText('MindPin can suggest people from your contacts. Your address book is never uploaded.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Allow MindPin to read your contacts' }));
    expect(onAllowContacts).toHaveBeenCalledTimes(1);
  });

  it('does not ask again once contacts are allowed or refused, and a typed name still works (R3.4)', async () => {
    const { view, onChange } = setup({ access: 'denied', contacts: [], text: 'Sa', choice: { kind: 'new', name: 'Sa' } });
    await view;
    await fireEvent(screen.getByLabelText('Whose place is this?'), 'focus');
    expect(screen.queryByRole('button', { name: 'Allow MindPin to read your contacts' })).toBeNull();
    expect(screen.getByText('Contacts are off. A typed name is saved as a new person.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Whose place is this?'), 'Sara');
    expect(onChange).toHaveBeenLastCalledWith('Sara', { kind: 'new', name: 'Sara' });
  });

  it('finds matches among 1,000 contacts well inside 300 ms (R3.2)', async () => {
    const many: DeviceContact[] = Array.from({ length: 1000 }, (_, i) => ({
      contactRef: `m-${i}`,
      name: `Person ${i} Sample`,
      phone: null,
      photoUri: null,
    }));
    const started = Date.now();
    await setup({ text: 'Person 99', choice: { kind: 'new', name: 'Person 99' }, contacts: many }).view;
    expect(screen.getByText('Person 99 Sample')).toBeTruthy();
    expect(Date.now() - started).toBeLessThan(300);
  });
});
