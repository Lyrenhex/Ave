<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Partial Class Form1
    Inherits MaterialSkin.Controls.MaterialForm

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()>
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()>
    Private Sub InitializeComponent()
        Me.txtInput = New MaterialSkin.Controls.MaterialSingleLineTextField()
        Me.txtUsers = New System.Windows.Forms.TextBox()
        Me.SuspendLayout()
        '
        'txtInput
        '
        Me.txtInput.Anchor = CType(((System.Windows.Forms.AnchorStyles.Bottom Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtInput.Depth = 0
        Me.txtInput.Hint = ""
        Me.txtInput.Location = New System.Drawing.Point(13, 512)
        Me.txtInput.MouseState = MaterialSkin.MouseState.HOVER
        Me.txtInput.Name = "txtInput"
        Me.txtInput.PasswordChar = Global.Microsoft.VisualBasic.ChrW(0)
        Me.txtInput.SelectedText = ""
        Me.txtInput.SelectionLength = 0
        Me.txtInput.SelectionStart = 0
        Me.txtInput.Size = New System.Drawing.Size(790, 23)
        Me.txtInput.TabIndex = 0
        Me.txtInput.UseSystemPasswordChar = False
        '
        'txtUsers
        '
        Me.txtUsers.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.txtUsers.BackColor = System.Drawing.Color.FromArgb(CType(CType(224, Byte), Integer), CType(CType(224, Byte), Integer), CType(CType(224, Byte), Integer))
        Me.txtUsers.Location = New System.Drawing.Point(680, 68)
        Me.txtUsers.Multiline = True
        Me.txtUsers.Name = "txtUsers"
        Me.txtUsers.ReadOnly = True
        Me.txtUsers.ScrollBars = System.Windows.Forms.ScrollBars.Vertical
        Me.txtUsers.Size = New System.Drawing.Size(130, 438)
        Me.txtUsers.TabIndex = 1
        '
        'Form1
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(815, 547)
        Me.Controls.Add(Me.txtInput)
        Me.Controls.Add(Me.txtUsers)
        Me.Name = "Form1"
        Me.Text = "Ave IRC"
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub

    Friend WithEvents txtInput As MaterialSkin.Controls.MaterialSingleLineTextField
    Friend WithEvents txtUsers As TextBox
End Class
