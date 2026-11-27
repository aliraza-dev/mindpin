import { fireEvent, render, screen } from '@testing-library/react-native';

import { Menu } from './Menu';

function setup(visible = true) {
  const onClose = jest.fn();
  const onEdit = jest.fn();
  const onDelete = jest.fn();
  const view = render(
    <Menu
      visible={visible}
      top={100}
      closeLabel="Close the menu"
      onClose={onClose}
      items={[
        { key: 'edit', label: 'Edit place', onPress: onEdit },
        { key: 'delete', label: 'Delete place', onPress: onDelete },
      ]}
    />,
  );
  return { view, onClose, onEdit, onDelete };
}

describe('Menu', () => {
  it('shows nothing while closed', async () => {
    await setup(false).view;
    expect(screen.queryByText('Edit place')).toBeNull();
  });

  it('lists its actions, each announced as a menu item', async () => {
    await setup().view;
    expect(screen.getByRole('menuitem', { name: 'Edit place' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Delete place' })).toBeTruthy();
  });

  it('closes and runs the action that was tapped, and no other', async () => {
    const { view, onClose, onEdit, onDelete } = setup();
    await view;
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Edit place' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('closes without running anything when the area outside it is tapped', async () => {
    const { view, onClose, onEdit, onDelete } = setup();
    await view;
    await fireEvent.press(screen.getByRole('button', { name: 'Close the menu' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('gives every row a touch target of at least 44 px', async () => {
    await setup().view;
    const row = screen.getByRole('menuitem', { name: 'Edit place' });
    const style = Array.isArray(row.props.style) ? Object.assign({}, ...row.props.style.filter(Boolean)) : row.props.style;
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});
