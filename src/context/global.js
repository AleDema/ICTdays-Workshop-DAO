import { proxy } from 'valtio'

const state = proxy({
    principal: null
})

export default state;