import { describe, expect, it } from "vitest"
import { mount } from "@vue/test-utils"
import LoginForm from "@/components/LoginForm.vue"

describe("LoginForm.vue (functional test)", () => {
    it("permet à l’utilisateur de saisir ses identifiants et d’envoyer le formulaire", async () => {
        const wrapper = mount(LoginForm)

        const emailInput = wrapper.get("input#email")
        const passwordInput = wrapper.get("input#password")

        await emailInput.setValue("user@example.com")
        await passwordInput.setValue("super-secret")

        await wrapper.trigger("submit.prevent")

        const submitEvents = wrapper.emitted("submit")

        expect(submitEvents).toBeTruthy()
        expect(submitEvents?.[0]?.[0]).toEqual({
            email: "user@example.com",
            password: "super-secret",
        })
    })
})
