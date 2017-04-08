import React from 'react'
import { Model, SelectNode, ValueNode, addChange } from '../../..'

const Garments = [
  { id: 'semi-custom-pant', name: 'Semi-Custom Pants', garmentTypeId: 'pant' },
  { id: 'full-custom-pant', name: 'Full Custom Pants', garmentTypeId: 'pant' },
  { id: 'short-pant', name: 'Short Pants', garmentTypeId: 'pant' },

  { id: 'two-button-jersey', name: 'Two-Button Jersey', garmentTypeId: 'jersey' },
  { id: 'full-custom-jersey', name: 'Full Custom Jersey', garmentTypeId: 'jersey' },
  { id: 'short-sleeve-jersey', name: 'Short Sleeve Jersey', garmentTypeId: 'jersey' },
]

function Select({ dispatch, node: { keyPath, state } }) {
  function onChange(e) {
    dispatch(addChange(keyPath, e.target.value))
  }

  return <select onChange={onChange} value={state.value}>
    {state.options.map(opt => {
      return <option key={opt.id} value={opt.id}>{opt.name}</option>
    })}
  </select>
}

const schema = {
  product: {
    garmentType: SelectNode({
      options: [
        { id: 'pant', name: 'Pant' },
        { id: 'jersey', name: 'Jersey' }
      ],
      behavior: {
        component: Select
      }
    }),
    garment: SelectNode({
      dependencies: { garmentType: '.garmentType' },
      options({ garmentType }) {
        return Garments.filter(row => row.garmentTypeId === garmentType.value)
      },
      behavior: {
        component: Select
      }
    }),
    fillAreas: {
      color1: SelectNode({
        options: [{ id: 'black', name: 'black' }],
        behavior: {
          component: Select
        }
      })
    }
  }
}

export default Model({ schema })
