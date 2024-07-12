/* eslint-disable ts/ban-types */
import { type Ref, computed, defineComponent, h, inject, markRaw, provide, ref, watch, watchEffect } from 'vue'
import { Slot, usePrimitiveElement } from '@/Primitive'

interface CollectionContext<ItemData = {}> {
  collectionRef: Ref<HTMLElement | undefined>
  itemMap: Ref<Map<HTMLElement, { ref: HTMLElement, value?: any } & ItemData>>
}

const ITEM_DATA_ATTR = 'data-radix-vue-collection-item'

export function useCollection<ItemData = {}>(options: { key?: string, isProvider?: boolean } = {}) {
  const { key = '', isProvider = false } = options
  const injectionKey = `${key}CollectionProvider`
  let context: CollectionContext<ItemData>

  if (isProvider) {
    const itemMap = ref<Map<HTMLElement, { ref: HTMLElement } & ItemData>>(new Map())
    const collectionRef = ref<HTMLElement>()

    context = {
      collectionRef,
      itemMap,
    } as CollectionContext<ItemData>
    provide(injectionKey, context)
  }
  else {
    context = inject(injectionKey) as CollectionContext<ItemData>
  }

  const getItems = (includeDisabledItem = false) => {
    const collectionNode = context.collectionRef.value
    if (!collectionNode)
      return []
    const orderedNodes = Array.from(collectionNode.querySelectorAll(`[${ITEM_DATA_ATTR}]`))
    const items = Array.from(context.itemMap.value.values())
    const orderedItems = items.sort(
      (a, b) => orderedNodes.indexOf(a.ref) - orderedNodes.indexOf(b.ref),
    )

    if (includeDisabledItem)
      return orderedItems
    else
      return orderedItems.filter(i => i.ref.dataset.disabled !== '')
  }

  const CollectionSlot = defineComponent({
    name: 'CollectionSlot',
    setup(_, { slots }) {
      const { primitiveElement, currentElement } = usePrimitiveElement()
      watch(currentElement, () => {
        context.collectionRef.value = currentElement.value
      })
      return () => h(Slot, { ref: primitiveElement }, slots)
    },
  })

  const CollectionItem = defineComponent({
    name: 'CollectionItem',
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      const { primitiveElement, currentElement } = usePrimitiveElement()
      const { value, ...restAttrs } = attrs

      watchEffect((cleanupFn) => {
        if (currentElement.value) {
          const key = markRaw(currentElement.value)
          // @ts-expect-error ignore assignment of unknown to any
          context.itemMap.value.set(key, { ref: currentElement.value!, value })
          cleanupFn(() => context.itemMap.value.delete(key))
        }
      })

      return () => h(Slot, { ...restAttrs, [ITEM_DATA_ATTR]: '', ref: primitiveElement }, slots)
    },
  })

  const reactiveItems = computed(() => Array.from(context.itemMap.value.values()))
  const itemMapSize = computed(() => context.itemMap.value.size)

  return { getItems, reactiveItems, itemMapSize, CollectionSlot, CollectionItem }
}
