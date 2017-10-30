
const initialState = {
  formId: '',
  collection: 'TangyFormResponse',
  focusItemId: 'item_1',
  startDate: (new Date()).toLocaleString(),
  items: [],
  inputs: [],
  count: 0
}

function tangyFormReducer(state = initialState, action) {
  var items
  var currentIndex
  var newState
  switch(action.type) {

    case FORM_OPEN:
      currentIndex = action.items.findIndex((item) => (item.open))
      items = action.items
      if (currentIndex == -1) {
        items[0].open = true
      }
      return Object.assign({}, state, {items: [...items]})

    case ITEM_OPEN:
      return Object.assign({}, state, {items: state.items.map((item) => {
        if (item.id == action.itemId) {
          return Object.assign({}, item, {open: true})
        }
        return item
      })})

    case ITEM_VALID:
      items = state.items.map((item) => {
          if (state.focusId == item.id) {
            return Object.assign({}, item, {open: true})
          }
          if (item.id == action.itemId) {
            return Object.assign({}, item, {valid: true})
          }
          return item
        })
      return Object.assign({}, state, {
        progress: ( ( ( items.filter((i) => i.valid).length ) / items.length ) * 100 ),
        items: items 
      })

    case ITEM_CLOSE:
      return Object.assign({}, state, {
        progress: ( ( ( state.items.filter((i) => i.valid).length ) / state.items.length ) * 100 ),
        items: state.items.map((item) => {
          if (item.id == action.itemId) {
            return Object.assign({}, item, {open: false, valid: true})
          }
          return item
        })
      })

    case ITEM_CLOSE_STUCK:
      return Object.assign({}, state, {
        focusId: action.itemId,
        progress: ( ( ( state.items.filter((i) => i.valid == true).length + 1 ) / state.items.length ) * 100 ),
        items: state.items.map((item) => {
          if (item.id == action.itemId) {
            return Object.assign({}, item, {open: true, valid: false})
          }
          return item
        })
      })

    case ITEM_ENABLE:
      return Object.assign({}, state, {
        items: state.items.map((item) => {
          if (item.id == action.itemId) {
            return Object.assign({}, item, {disabled: false})
          }
          return item
        })
      })

    case ITEM_DISABLE:
      return Object.assign({}, state, {
        items: state.items.map((item) => {
          if (item.id == action.itemId) {
            return Object.assign({}, item, {disabled: true})
          }
          return item
        })
      })

    case INPUT_ADDED: 
      // If this input does not yet
      if (state.inputs.findIndex((input) => input.name === action.attributes.name) === -1) {
        return Object.assign({}, state, {inputs: [...state.inputs, action.attributes]})
      }
      break

    case INPUT_VALUE_CHANGE:
      return Object.assign({}, state, {inputs: state.inputs.map((input) => {
        if (input.name == action.inputName) {
          return Object.assign({}, input, {value: action.inputValue})
        }
        return input 
      })})
    break
    case INPUT_DISABLE:
    break

    case INPUT_SHOW:
      return Object.assign({}, state, { inputs: state.inputs.map((input) => {
        if (input.name == action.inputName) {
          return Object.assign({}, input, {hidden: false})
        }
        return input
      })})

    case INPUT_HIDE:
      return Object.assign({}, state, { inputs: state.inputs.map((input) => {
        if (input.name == action.inputName) {
          return Object.assign({}, input, {hidden: true})
        }
        return input
      })})

    case NAVIGATE_TO_NEXT_ITEM:
      currentIndex = state.items.findIndex((item) => item.open === true)
      nextFocusId = ''
      items = state.items.map((item, i) => {
        if (i == currentIndex) {
          return Object.assign({}, item, {open: false})
        } else if (i == currentIndex + 1) {
          let potentialNewIndex = i
          while (state.items[potentialNewIndex] && state.items[potentialNewIndex].disabled === true) {
            if (state.items[potentialNewIndex+1]) {
              potentialNewIndex++
            } else {
              potentialNewIndex = 'no potential new index' 
            }
          }
          if (typeof (potentialNewIndex) == 'number') nextFocusId = state.items[potentialNewIndex].id 
        }
        return item
      })
      return Object.assign({}, state, { items: items, focusId: nextFocusId })

    case NAVIGATE_TO_PREVIOUS_ITEM:
      currentIndex = state.items.findIndex((item) => item.open === true)
      nextFocusId = ''
      items = state.items.map((item, i) => {
        if (i == currentIndex) {
          return Object.assign({}, item, {open: false})
        } else if (i == currentIndex - 1) {
          let potentialNewIndex = i
          while (state.items[potentialNewIndex] && state.items[potentialNewIndex].disabled === true) {
            if (state.items[potentialNewIndex-1]) {
              potentialNewIndex--
            } else {
              potentialNewIndex = 'no potential new index' 
            }
          }
          if (typeof (potentialNewIndex) == 'number') nextFocusId = state.items[potentialNewIndex].id 
        }
        return item
      })
      return Object.assign({}, state, { items: items, focusId: nextFocusId })

    default: 
      return state
  }
  return state


}
/*
function tangyFormReducer(state = initialState, action) {
  return {
    items: tangyFormItemReducer(state.items, action)
  }

}

function tangyFormItemReducer(state = [], action) {
  switch(action.type) {

    case FORM_OPEN:
      return [...action.items]

    case ITEM_OPEN:
      return state.map((item) => {
        if (item.id == action.itemId) {
          return Object.assign({}, item, {open: true})
        }
        return item
      })

    case ITEM_CLOSE:
      return state.map((item) => {
        if (item.id == action.itemId) {
          return Object.assign({}, item, {open: false})
        }
        return item
      })

    case ITEM_DISABLE:
    break
    case INPUT_VALUE_CHANGE:
      newState = Object.assign({}, state)
      newState.inputs[action.inputName] = action.inputValue 
    break
    case INPUT_DISABLE:
    break
    case INPUT_HIDE:
    break
    case NAVIGATE_TO_NEXT_ITEM:
    break
    case NAVIGATE_TO_PREVIOUS_ITEM:
    break
    default: 
      return state
  }


}
*/

