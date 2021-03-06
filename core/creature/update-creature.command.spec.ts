import { mock } from 'jest-mock-extended'
import { CommandBus } from '../infrastructure/command/command.bus'
import { EventBus } from '../infrastructure/event/event.bus'
import { SimpleEventBus } from '../infrastructure/event/simple-event.bus'
import { DataStorage } from '../infrastructure/storage/data-storage'
import { SkillType } from '../skill/skill.type'
import { CreatureNotFoundError } from './creature-not-found.error'
import { CreatureUpdatedEvent } from './creature-updated.event'
import { CreatureDto } from './dto/creature.dto'
import { UpdateCreatureCommand } from './update-creature.command'
import { UpdateCreatureHandler } from './update-creature.handler'

describe('UpdateCreatureCommand', () => {
  const creatureDto: CreatureDto = {
    id: 1,
    name: 'Test name',
    skill: SkillType.THROWING_RHYME,
    health: 1,
    lives: 1,
    strength: 1,
  }
  let eventBus: EventBus
  let commandBus: CommandBus
  let storage: DataStorage

  beforeEach(() => {
    eventBus = new SimpleEventBus()
    commandBus = new CommandBus()
    storage = mock<DataStorage>({
      save: jest.fn((payload) => payload),
      findOne: jest.fn(() => ({ ...creatureDto })) as any,
    })
  })

  it('should update creature in data storage and publish event with changed properties', async () => {
    let lastPublishedEvent

    eventBus.registerAll({ event: CreatureUpdatedEvent })
    eventBus.subscribe((event: any) => (lastPublishedEvent = event))
    commandBus.registerAll({ command: UpdateCreatureCommand, handler: new UpdateCreatureHandler(storage, eventBus) })
    await commandBus.execute(new UpdateCreatureCommand(1, { lives: 3, strength: 0.5 }))

    expect(storage.save).toBeCalled()
    expect(lastPublishedEvent).toBeInstanceOf(CreatureUpdatedEvent)
    expect(lastPublishedEvent).toHaveProperty('updatedProperties', { lives: 3, strength: 0.5 })
  })

  it('should throw CreatureNotFound error when passed id does not belong to any creature', async () => {
    const localStorage: DataStorage = storage
    localStorage.findOne = jest.fn(() => undefined)

    commandBus.registerAll({
      command: UpdateCreatureCommand,
      handler: new UpdateCreatureHandler(localStorage, eventBus),
    })

    const executePromise = commandBus.execute(new UpdateCreatureCommand(1, { lives: 3, strength: 0.5 }))
    await expect(executePromise).rejects.toThrow(CreatureNotFoundError)
  })

  it('should not change creature if passed payload has all properties undefined', async () => {
    let lastPublishedEvent

    eventBus.registerAll({ event: CreatureUpdatedEvent })
    eventBus.subscribe((event: any) => (lastPublishedEvent = event))
    commandBus.registerAll({ command: UpdateCreatureCommand, handler: new UpdateCreatureHandler(storage, eventBus) })
    await commandBus.execute(new UpdateCreatureCommand(1, {}))

    expect(storage.save).toReturnWith({ ...creatureDto })
    expect(lastPublishedEvent).toBeInstanceOf(CreatureUpdatedEvent)
    expect(lastPublishedEvent).toHaveProperty('updatedProperties', {})
  })
})
