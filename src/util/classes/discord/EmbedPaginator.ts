import config from "#config";
import type { SDT } from "@sern/handler";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  type CacheType,
  type CommandInteraction,
  ComponentType,
  type EmbedBuilder,
  InteractionCollector,
  InteractionResponse,
} from "discord.js";
import { disableAllButtons } from "../../functions/other/disableAllButtons";

enum MoveButtonIds {
  Next = "next_page",
  Back = "prev_page",
}

// Buttons
const moveBackButton = new ButtonBuilder({
  custom_id: MoveButtonIds.Back,
  emoji: "⏪",
  label: "Back",
  style: ButtonStyle.Secondary,
});
const moveForwardButton = new ButtonBuilder({
  custom_id: MoveButtonIds.Next,
  emoji: "⏩",
  label: "Forward",
  style: ButtonStyle.Secondary,
});

type Listener = InteractionCollector<ButtonInteraction<CacheType>>;

/**
 * Represents a Discord page that includes an embed and action rows.
 */
export class Page {
  constructor(
    public embed: EmbedBuilder,
    public rows: ActionRowBuilder<ButtonBuilder>[],
  ) {}

  public hasMoveButtons() {
    const moveButtonRow = this.rows.find((row) =>
      row.components.some((b) => {
        // Skipping if this button doesn't have a custom id (might be a link button)
        if (!("custom_id" in b.data)) return false;

        // Checking if the button has next or prev
        return (
          b.data.custom_id === MoveButtonIds.Next ||
          b.data.custom_id === MoveButtonIds.Back
        );
      }),
    );

    return !!moveButtonRow;
  }
}

/**
 * Helps paginate embeds via Discord.
 * Automatically adds page move buttons to each page if they are missing.
 */
export class EmbedPaginator {
  private currentPage = 0;
  private timeoutSeconds = 150_000; // 2.5 mins
  private timeout: ReturnType<typeof setTimeout> | null = null;
  public readonly pages: Page[] = [];

  constructor(
    private interaction: CommandInteraction,
    private sdt: SDT,
  ) {}

  public async run(
    /**
     * Will be fired if a button is clicked that is not the moving buttons
     */
    buttonClick: (interaction: ButtonInteraction<CacheType>) => any = () =>
      null,
  ) {
    // Validating pages
    this.validatePages();

    // Resolving services
    const langManager = this.sdt.deps.langManager;

    const initialPage = this.pages[0];

    // Send initial page
    const initialRes = await this.interaction.reply({
      embeds: [initialPage.embed],
      components: this.getComponents(),
    });

    const filter = (i: ButtonInteraction, reverse: boolean) => {
      const isMoveButton =
        i.customId === MoveButtonIds.Next || i.customId === MoveButtonIds.Back;
      return (
        // Filter for author user only
        i.user.id === this.interaction.user.id &&
        // Filter for move buttons only (or not)
        (reverse ? !isMoveButton : isMoveButton)
      );
    };

    // Create listeners
    const moveButtonListener = initialRes.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => filter(i, false),
    });
    const genericListener = initialRes.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: (i) => filter(i, true),
    });

    // Starting the timeout
    this.refreshTimeout(moveButtonListener, genericListener, initialRes);

    // ------- Registering events ------- //

    // Primary clicks
    moveButtonListener.on("collect", async (i) => {
      this.refreshTimeout(moveButtonListener, genericListener, initialRes);

      // Update the current page based on the button clicked
      if (i.customId === MoveButtonIds.Back && this.currentPage > 0) {
        --this.currentPage;
      } else if (
        i.customId === MoveButtonIds.Next &&
        this.currentPage < this.pages.length - 1
      ) {
        ++this.currentPage;
      }

      // Creating the new page to send
      const newPage = this.pages[this.currentPage];

      await Promise.all([
        i.message.edit({
          embeds: [newPage.embed],
          components: this.getComponents(),
        }),
        i.deferUpdate(),
      ]);
    });
    genericListener.on("collect", (i) => {
      this.refreshTimeout(moveButtonListener, genericListener, initialRes);
      buttonClick(i);
    });

    // Disposed clicks
    const handleInvalidUserClick = async (i: ButtonInteraction) => {
      await i.reply(
        langManager.getResponse<"text">("errors.button_wrong_person"),
      );
    };

    moveButtonListener.on("dispose", handleInvalidUserClick);
    genericListener.on("dispose", handleInvalidUserClick);
  }

  public setTimeout(timeout: number) {
    this.timeoutSeconds = timeout;
  }

  public addPages(pages: Page[]) {
    // Merging pages
    this.pages.push(...pages);
  }

  public remPage(index: number) {
    this.pages.splice(index, 1);
  }

  // -------------- Helpers -------------- //

  /**
   * Gets the current page components.
   * Auto disables relevant buttons
   */
  private getComponents() {
    // Get the current page
    const currentPage = this.pages[this.currentPage];

    // Ensuring the current page has the move buttons
    if (!currentPage.hasMoveButtons()) {
      throw new Error(
        "Page is missing move buttons at index: " + this.currentPage,
      );
    }

    // Extracting the move buttons
    const moveBackButton = currentPage.rows[0].components[0];
    const moveForwardButton = currentPage.rows[0].components[1];

    // Setting disabled values
    moveBackButton.setDisabled(this.currentPage === 0);
    moveForwardButton.setDisabled(this.currentPage === this.pages.length - 1);

    return currentPage.rows;
  }

  private validatePages() {
    this.pages.forEach((page) => {
      if (!page.hasMoveButtons()) {
        page.rows.unshift(
          new ActionRowBuilder<ButtonBuilder>({
            components: [moveBackButton, moveForwardButton],
          }),
        );

        if (page.rows.length > config.api.maxActionRowLength) {
          throw new Error(
            "Action row length exceeded. Pagination pages shouldn't contain more than 4 action rows pre validation.",
          );
        }
      }
    });
  }

  private startTimeout(
    listener1: Listener,
    listener2: Listener,
    res: InteractionResponse,
  ) {
    this.timeout = setTimeout(async () => {
      // Fetching the rows for current page
      const rows = this.pages[this.currentPage].rows;

      // Disable Buttons
      await res.edit({
        components: disableAllButtons(rows),
      });

      // Stop Listeners
      listener1.stop();
      listener2.stop();
    }, this.timeoutSeconds);
  }

  private refreshTimeout(
    listener1: Listener,
    listener2: Listener,
    res: InteractionResponse,
  ) {
    // Update timeout in filter
    if (this.timeout) {
      // Clearing existing timeout
      clearTimeout(this.timeout);
    }

    // Setting a new timeout
    this.startTimeout(listener1, listener2, res);
  }
}
