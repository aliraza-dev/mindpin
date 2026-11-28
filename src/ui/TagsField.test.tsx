// The tags field: a comma makes a pill; a cross or Backspace removes one (R4.2).
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { joinTags, splitTags, TagsField } from './TagsField';

const changes: string[] = [];

function Field({ start = '' }: { start?: string }) {
  const [value, setValue] = useState(start);
  return (
    <TagsField
      label="Tags"
      value={value}
      onChangeText={(text) => {
        changes.push(text);
        setValue(text);
      }}
      removeLabel={(tag) => `Remove tag ${tag}`}
      tagMaxLength={40}
    />
  );
}

const input = () => screen.getByLabelText('Tags');
const backspace = () => fireEvent(input(), 'keyPress', { nativeEvent: { key: 'Backspace' } });

describe('splitTags and joinTags', () => {
  it('keeps what is after the last comma as the tag being typed', () => {
    expect(splitTags('Parking,  Floor 3 , gat')).toEqual({
      tags: ['Parking', 'Floor 3'],
      draft: 'gat',
    });
    expect(splitTags('Parking, ')).toEqual({ tags: ['Parking'], draft: '' });
    expect(splitTags('')).toEqual({ tags: [], draft: '' });
    expect(splitTags(', ,x')).toEqual({ tags: [], draft: 'x' });
  });

  it('puts them back as text with commas', () => {
    expect(joinTags(['Parking', 'Floor 3'], 'gat')).toBe('Parking, Floor 3, gat');
    expect(joinTags(['Parking'])).toBe('Parking, ');
    expect(joinTags([], 'gat')).toBe('gat');
  });
});

describe('TagsField', () => {
  beforeEach(() => {
    changes.length = 0;
  });

  it('turns what was typed into a pill when a comma is typed', async () => {
    await render(<Field />);
    await fireEvent.changeText(input(), 'Parking');
    expect(screen.queryByRole('button', { name: 'Remove tag Parking' })).toBeNull();
    await fireEvent.changeText(input(), 'Parking,');
    expect(screen.getByRole('button', { name: 'Remove tag Parking' })).toBeTruthy();
    expect(input().props.value).toBe('');
    expect(changes[changes.length - 1]).toBe('Parking,');
  });

  it('removes a pill with its cross, keeping what is being typed', async () => {
    await render(<Field start="Parking, Floor 3, gat" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove tag Parking' }));
    expect(screen.queryByText('Parking')).toBeNull();
    expect(screen.getByText('Floor 3')).toBeTruthy();
    expect(input().props.value).toBe('gat');
  });

  it('removes the last pill on Backspace only when nothing is typed after it', async () => {
    await render(<Field start="Parking, Floor 3, g" />);
    await backspace();
    expect(screen.getByText('Floor 3')).toBeTruthy();
    await fireEvent.changeText(input(), '');
    await backspace();
    expect(screen.queryByText('Floor 3')).toBeNull();
    expect(screen.getByText('Parking')).toBeTruthy();
  });

  it('ends the tag with Done on the keyboard as well', async () => {
    await render(<Field start="Parking, gate" />);
    await fireEvent(input(), 'submitEditing');
    expect(screen.getByRole('button', { name: 'Remove tag gate' })).toBeTruthy();
    expect(input().props.value).toBe('');
  });
});
