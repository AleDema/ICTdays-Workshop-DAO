import { proxy } from 'valtio'

const state = proxy({
    count: 0,
    text: 'hello',
    daoActor: null,
    principal: null
})

export default state;