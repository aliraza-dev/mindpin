// The floating + button on Home (R6.5).
import { fireEvent, render, screen } from '@testing-library/react-native';

import { AddMenu } from './AddMenu';

function setup() {
  const addPlace = jest.fn();
  const newNote = jest.fn();
  const view = render(
    <AddMenu
      openLabel="Add something"
      closeLabel="Close the add menu"
      choices={[
        {
          key: 'note',
          label: 'New note',
          accessibilityLabel: 'Write a new note',
          onPress: newNote,
        },
        {
          key: 'place',
          label: 'Add place',
          accessibilityLabel: 'Add a place by hand',
          onPress: addPlace,
        },
      ]}
    />,
  );
  return { view, addPlace, newNote };
}

const plus = () => screen.getByRole('button', { name: 'Add something' });

describe('AddMenu', () => {
  it('shows only the + until it is tapped', async () => {
    await setup().view;
    expect(plus()).toBeCollapsed();
    expect(screen.queryByRole('button', { name: 'Write a new note' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add a place by hand' })).toBeNull();
  });

  it('offers a new note and a new place, and closes after one is chosen', async () => {
    const { view, addPlace, newNote } = setup();
    await view;
    await fireEvent.press(plus());
    expect(screen.getByText('New note')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a place by hand' }));
    expect(addPlace).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('New note')).toBeNull();

    await fireEvent.press(plus());
    await fireEvent.press(screen.getByRole('button', { name: 'Write a new note' }));
    expect(newNote).toHaveBeenCalledTimes(1);
  });

  it('closes without adding anything when the × or the area outside is tapped', async () => {
    const { view, addPlace, newNote } = setup();
    await view;
    await fireEvent.press(plus());
    const closers = screen.getAllByRole('button', { name: 'Close the add menu' });
    expect(closers).toHaveLength(2);
    await fireEvent.press(closers[0]);
    expect(screen.queryByText('Add place')).toBeNull();
    expect(addPlace).not.toHaveBeenCalled();
    expect(newNote).not.toHaveBeenCalled();
  });
});
