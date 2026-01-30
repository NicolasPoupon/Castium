import { describe, expect, it, vi } from "vitest"
import { mount } from "@vue/test-utils"
import TestButton from "@/components/TestButton.vue"

describe("TestButton.vue (component test)", () => {
    it("affiche le label passé en prop", () => {
        const wrapper = mount(TestButton, {
            props: {
                label: "Cliquer ici",
            },
        })

        expect(wrapper.text()).toContain("Cliquer ici")
    })

    it("émet un évènement 'click' quand on clique sur le bouton", async () => {
        const onClick = vi.fn()

        const wrapper = mount(TestButton, {
            props: {
                label: "Cliquer ici",
                onClick,
            },
        })

        await wrapper.trigger("click")

        expect(onClick).toHaveBeenCalledTimes(1)
    })
})
